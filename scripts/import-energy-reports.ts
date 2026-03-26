import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import XLSX from "xlsx";
import { env } from "../server/config.js";

type ParsedEnergyProject = {
  availableGranularities: string[];
  availableMeterTypes: string[];
  code: string;
  firstSampleDate: string;
  lastSampleDate: string;
  name: string;
  organizationPath: string;
  recordCount: number;
};

type ParsedEnergyRecord = {
  energyPath: string;
  meterName: string;
  meterNumber: string;
  organizationPath: string;
  projectCode: string;
  projectName: string;
  sampleDate: string;
  sourceFile: string;
  usageKwh: number;
};

const defaultDesktopDirectory = "\\\\Mac\\Home\\Desktop";
const defaultFileSuffixes = ["20260326090129.xlsx", "20260326090143.xlsx"];
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDir, "..");
const localCacheFilePath = path.join(
  projectRoot,
  "server",
  "data",
  "imported-energy-data.json",
);
const defaultGranularities = ["day"];
const defaultMeterTypes = ["electricity"];

const normalizeText = (value: unknown) => {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return "";
};

const toUsageNumber = (value: unknown) => {
  const normalized = normalizeText(value).replace(/,/g, "");

  if (!normalized) {
    return null;
  }

  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : null;
};

const normalizeDateHeader = (value: unknown) => {
  const normalized = normalizeText(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : "";
};

const resolveInputFiles = (inputArgs: string[]) => {
  const directFiles = inputArgs
    .map((filePath) => filePath.trim())
    .filter(Boolean)
    .map((filePath) => path.resolve(filePath));

  if (directFiles.length > 0) {
    return directFiles;
  }

  if (!fs.existsSync(defaultDesktopDirectory)) {
    return [];
  }

  return fs
    .readdirSync(defaultDesktopDirectory)
    .filter((fileName) =>
      defaultFileSuffixes.some((suffix) => fileName.endsWith(suffix)),
    )
    .sort()
    .map((fileName) => path.join(defaultDesktopDirectory, fileName));
};

const parseWorkbook = (filePath: string) => {
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error(`No worksheet found in ${filePath}`);
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Array<string | number | null>>(
    worksheet,
    {
      defval: null,
      header: 1,
      raw: false,
    },
  );

  const [headerRow = [], ...dataRows] = rows;

  if (headerRow.length < 7) {
    throw new Error(`Unexpected header shape in ${filePath}`);
  }

  const dateColumns = headerRow
    .slice(6)
    .map((headerValue, index) => ({
      columnIndex: index + 6,
      sampleDate: normalizeDateHeader(headerValue),
    }))
    .filter((item) => item.sampleDate);

  if (dateColumns.length === 0) {
    throw new Error(`No date columns found in ${filePath}`);
  }

  const sourceFile = path.basename(filePath);
  const projects = new Map<string, ParsedEnergyProject>();
  const records: ParsedEnergyRecord[] = [];

  dataRows.forEach((row, rowIndex) => {
    const energyPath = normalizeText(row[0]);
    const meterName = normalizeText(row[1]);
    const meterNumber = normalizeText(row[2]);
    const organizationPath = normalizeText(row[3]);
    const projectName = normalizeText(row[4]);
    const projectCode = normalizeText(row[5]);

    if (!projectName || !projectCode || !meterNumber) {
      return;
    }

    const projectEntry = projects.get(projectCode) ?? {
      availableGranularities: [...defaultGranularities],
      availableMeterTypes: [...defaultMeterTypes],
      code: projectCode,
      firstSampleDate: dateColumns[0]?.sampleDate ?? "",
      lastSampleDate: dateColumns.at(-1)?.sampleDate ?? "",
      name: projectName,
      organizationPath,
      recordCount: 0,
    };

    dateColumns.forEach(({ columnIndex, sampleDate }) => {
      const usageKwh = toUsageNumber(row[columnIndex]);

      if (usageKwh === null) {
        return;
      }

      projectEntry.recordCount += 1;

      records.push({
        energyPath: energyPath || "Uncategorized",
        meterName: meterName || `Meter ${rowIndex + 1}`,
        meterNumber,
        organizationPath,
        projectCode,
        projectName,
        sampleDate,
        sourceFile,
        usageKwh: Number(usageKwh.toFixed(2)),
      });
    });

    projects.set(projectCode, projectEntry);
  });

  return {
    projects: [...projects.values()],
    records,
  };
};

const metricAtFromSampleDate = (sampleDate: string) =>
  new Date(`${sampleDate}T00:00:00+08:00`).toISOString();

const run = async () => {
  const inputFiles = resolveInputFiles(process.argv.slice(2));

  if (inputFiles.length === 0) {
    throw new Error(
      "No Excel files found. Pass file paths or place the exports on the desktop.",
    );
  }

  inputFiles.forEach((filePath) => {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Excel file not found: ${filePath}`);
    }
  });

  const parsedBatches = inputFiles.map(parseWorkbook);
  const allProjects = new Map<string, ParsedEnergyProject>();
  const allRecords = parsedBatches.flatMap((batch) => {
    batch.projects.forEach((project) => allProjects.set(project.code, project));
    return batch.records;
  });

  if (allRecords.length === 0) {
    throw new Error(
      "No energy rows were parsed from the provided Excel files.",
    );
  }

  fs.mkdirSync(path.dirname(localCacheFilePath), { recursive: true });
  fs.writeFileSync(
    localCacheFilePath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        projects: [...allProjects.values()].map((project) => ({
          availableGranularities: project.availableGranularities,
          availableMeterTypes: project.availableMeterTypes,
          firstSampleDate: project.firstSampleDate,
          lastSampleDate: project.lastSampleDate,
          orgId: project.code,
          organizationPath: project.organizationPath,
          projectCode: project.code,
          projectName: project.name,
          recordCount: project.recordCount,
        })),
        records: allRecords.map((record) => ({
          energy_path: record.energyPath,
          granularity: "day",
          meter_name: record.meterName,
          meter_number: record.meterNumber,
          meter_type: "electricity",
          metadata: {
            importSource: "energy-report-import",
            sourceFile: record.sourceFile,
          },
          org_id: record.projectCode,
          organization_path: record.organizationPath,
          project_code: record.projectCode,
          project_name: record.projectName,
          sample_date: record.sampleDate,
          source_file: record.sourceFile,
          usage_kwh: record.usageKwh,
        })),
      },
      null,
      2,
    ),
  );

  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
    console.log(
      JSON.stringify(
        {
          files: inputFiles.map((filePath) => path.basename(filePath)),
          localCacheFile: localCacheFilePath,
          projects: [...allProjects.values()].map((project) => project.name),
          recordCount: allRecords.length,
          supabaseImported: false,
        },
        null,
        2,
      ),
    );
    return;
  }

  const supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const projectUpserts = [...allProjects.values()].map((project) => ({
    code: project.code,
    location: "Shanghai",
    metadata: {
      availableGranularities: project.availableGranularities,
      availableMeterTypes: project.availableMeterTypes,
      firstSampleDate: project.firstSampleDate,
      lastSampleDate: project.lastSampleDate,
      organizationPath: project.organizationPath,
      recordCount: project.recordCount,
      source: "energy-report-import",
    },
    name: project.name,
    timezone: "Asia/Shanghai",
  }));

  let supabaseImported = true;
  let supabaseError = "";

  try {
    const { error: projectUpsertError } = await supabase
      .from("projects")
      .upsert(projectUpserts, { onConflict: "code" });

    if (projectUpsertError) {
      throw new Error(projectUpsertError.message);
    }

    const { data: projectRows, error: projectSelectError } = await supabase
      .from("projects")
      .select("id, code")
      .in(
        "code",
        [...allProjects.values()].map((project) => project.code),
      );

    if (projectSelectError) {
      throw new Error(projectSelectError.message);
    }

    const projectIdByCode = new Map(
      (projectRows ?? []).map((row) => [String(row.code), String(row.id)]),
    );

    const batchSize = 500;

    for (let index = 0; index < allRecords.length; index += batchSize) {
      const chunk = allRecords.slice(index, index + batchSize);
      const metricRows = chunk.flatMap((record) => {
        const projectId = projectIdByCode.get(record.projectCode);

        if (!projectId) {
          return [];
        }

        return [
          {
            carbon_kg: 0,
            cost_amount: 0,
            energy_type: "electricity",
            metadata: {
              energyPath: record.energyPath,
              granularity: "day",
              importSource: "energy-report-import",
              meterName: record.meterName,
              meterNumber: record.meterNumber,
              organizationPath: record.organizationPath,
              projectCode: record.projectCode,
              projectName: record.projectName,
              sampleDate: record.sampleDate,
              sourceFile: record.sourceFile,
              unit: "kWh",
            },
            metric_at: metricAtFromSampleDate(record.sampleDate),
            project_id: projectId,
            source: record.meterNumber,
            usage_kwh: record.usageKwh,
          },
        ];
      });
      const queryRecordRows = chunk.flatMap((record) => {
        const projectId = projectIdByCode.get(record.projectCode);

        if (!projectId) {
          return [];
        }

        return [
          {
            energy_path: record.energyPath,
            granularity: "day",
            meter_name: record.meterName,
            meter_number: record.meterNumber,
            meter_type: "electricity",
            metadata: {
              importSource: "energy-report-import",
              unit: "kWh",
            },
            org_id: record.projectCode,
            organization_path: record.organizationPath,
            project_code: record.projectCode,
            project_id: projectId,
            project_name: record.projectName,
            sample_date: record.sampleDate,
            source_file: record.sourceFile,
            usage_kwh: record.usageKwh,
          },
        ];
      });

      const { error: metricUpsertError } = await supabase
        .from("energy_metrics")
        .upsert(metricRows, {
          onConflict: "project_id,metric_at,energy_type,source",
        });

      if (metricUpsertError) {
        throw new Error(metricUpsertError.message);
      }

      const { error: queryRecordUpsertError } = await supabase
        .from("energy_query_records")
        .upsert(queryRecordRows, {
          onConflict:
            "project_id,meter_number,sample_date,granularity,meter_type",
        });

      if (queryRecordUpsertError) {
        throw new Error(queryRecordUpsertError.message);
      }
    }
  } catch (error) {
    supabaseImported = false;
    supabaseError =
      error instanceof Error ? error.message : "Unknown Supabase import error";
  }

  console.log(
    JSON.stringify(
      {
        files: inputFiles.map((filePath) => path.basename(filePath)),
        localCacheFile: localCacheFilePath,
        projects: [...allProjects.values()].map((project) => project.name),
        recordCount: allRecords.length,
        supabaseError,
        supabaseImported,
      },
      null,
      2,
    ),
  );
};

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
