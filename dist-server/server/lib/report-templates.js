import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const findProjectRoot = () => {
    let cursor = currentDir;
    for (let index = 0; index < 6; index += 1) {
        if (fs.existsSync(path.join(cursor, 'package.json'))) {
            return cursor;
        }
        const nextCursor = path.dirname(cursor);
        if (nextCursor === cursor) {
            break;
        }
        cursor = nextCursor;
    }
    return path.resolve(currentDir, '..', '..');
};
const projectRoot = findProjectRoot();
const templatesDir = path.join(projectRoot, 'server', 'report-templates');
const standardTemplateFileMap = {
    group: {
        daily: 'lh_group_daily_template.md',
        monthly: 'lh_group_monthly_template.md',
        quarterly: 'lh_group_quarterly_template.md',
        weekly: 'lh_group_weekly_template.md',
        yearly: 'lh_group_yearly_template.md',
    },
    project: {
        daily: 'lh_project_daily_template.md',
        monthly: 'lh_project_monthly_template.md',
        quarterly: 'lh_project_quarterly_template.md',
        weekly: 'lh_project_weekly_template.md',
        yearly: 'lh_project_yearly_template.md',
    },
};
const singleMeterDiagnosticTemplateFile = '单电表用能异常诊断模板_仅基于电表数据.md';
const templateCache = new Map();
const readTemplate = (fileName) => {
    if (!templateCache.has(fileName)) {
        const filePath = path.join(templatesDir, fileName);
        templateCache.set(fileName, fs.readFileSync(filePath, 'utf8'));
    }
    return templateCache.get(fileName) ?? '';
};
const normalizeText = (value) => typeof value === 'string' ? value.trim() : '';
const collectRecords = (value, records = []) => {
    if (Array.isArray(value)) {
        value.forEach((item) => collectRecords(item, records));
        return records;
    }
    if (value && typeof value === 'object') {
        const record = value;
        records.push(record);
        Object.values(record).forEach((childValue) => collectRecords(childValue, records));
    }
    return records;
};
const getPrimaryRecordList = (value) => {
    if (!value || typeof value !== 'object') {
        return [];
    }
    const root = value;
    if (root.data && typeof root.data === 'object') {
        const data = root.data;
        if (Array.isArray(data.list)) {
            return data.list.filter((item) => Boolean(item) && typeof item === 'object');
        }
    }
    if (Array.isArray(root.list)) {
        return root.list.filter((item) => Boolean(item) && typeof item === 'object');
    }
    return collectRecords(value).filter((record) => Object.keys(record).some((key) => /orgId|deviceId|sampleTime|totalOne|meterType/i.test(key)));
};
const hasKeyword = (value, patterns) => patterns.some((pattern) => pattern.test(value));
const resolveReportPeriod = (input) => {
    const message = normalizeText(input.message);
    const timeRange = normalizeText(input.context?.timeRange);
    const combinedText = `${message} ${timeRange}`;
    if (hasKeyword(combinedText, [/(季报|季度|本季|Q[1-4]|quarter)/i])) {
        return 'quarterly';
    }
    if (hasKeyword(combinedText, [/(年报|年度|全年|本年|今年|year)/i])) {
        return 'yearly';
    }
    if (hasKeyword(combinedText, [/(月报|月度|本月|month)/i])) {
        return 'monthly';
    }
    if (hasKeyword(combinedText, [/(周报|周度|本周|week)/i])) {
        return 'weekly';
    }
    return 'daily';
};
const resolveReportScope = (input) => {
    const message = normalizeText(input.message);
    const project = normalizeText(input.context?.project);
    const queryName = normalizeText(input.requestPayload?.queryName);
    const combinedText = `${message} ${project} ${queryName}`;
    if (hasKeyword(combinedText, [/(集团|总部|整体|纳管项目|全局|group)/i])) {
        return 'group';
    }
    return 'project';
};
const looksLikeSingleMeterDiagnostic = (input) => {
    const message = normalizeText(input.message);
    const payloadText = JSON.stringify(input.requestPayload ?? {}).toLowerCase();
    const previewText = JSON.stringify(input.dataPreview ?? {}).toLowerCase();
    if (hasKeyword(message, [/(单电表|电表|表计|回路|单表|meter)/i])) {
        return true;
    }
    return /deviceid|devicename|devicenumber|meterid|metername/.test(`${payloadText} ${previewText}`);
};
export const selectReportTemplate = (input) => {
    const action = normalizeText(input.action);
    if (!action) {
        return null;
    }
    if (action === 'energy-diagnostic' && looksLikeSingleMeterDiagnostic(input)) {
        return {
            fileName: singleMeterDiagnosticTemplateFile,
            kind: 'single-meter-diagnostic',
            title: '单电表用能异常诊断模板',
            template: readTemplate(singleMeterDiagnosticTemplateFile),
        };
    }
    if (action !== 'energy-report' && action !== 'energy-diagnostic') {
        return null;
    }
    const period = resolveReportPeriod(input);
    const scope = resolveReportScope(input);
    const fileName = standardTemplateFileMap[scope][period];
    const scopeLabel = scope === 'group' ? '集团' : '项目';
    const periodLabelMap = {
        daily: '日报',
        monthly: '月报',
        quarterly: '季报',
        weekly: '周报',
        yearly: '年报',
    };
    return {
        fileName,
        kind: 'standard',
        period,
        scope,
        title: `${scopeLabel}${periodLabelMap[period]}模板`,
        template: readTemplate(fileName),
    };
};
export const analyzeReportDataAvailability = (input) => {
    const records = getPrimaryRecordList(input.dataPreview);
    const previewText = JSON.stringify(input.dataPreview ?? {}).toLowerCase();
    const payloadText = JSON.stringify(input.requestPayload ?? {}).toLowerCase();
    const combinedText = `${previewText} ${payloadText}`;
    const uniqueOrgIds = new Set(records.map((record) => normalizeText(record.orgId)).filter(Boolean));
    const hasDeviceFields = records.some((record) => Boolean(record.deviceId) || Boolean(record.deviceName) || Boolean(record.deviceNumber));
    const energyType = normalizeText(input.context?.energyType);
    const availability = {
        areaData: /(buildingarea|floorarea|建筑面积|面积)/i.test(combinedText),
        availableDataLabels: [],
        energyData: records.length > 0 || /metertype|totalone|totaltwo|usage|能耗/.test(combinedText),
        equipmentRuntimeData: /(runtime|runstatus|operating|运行状态|运行时长|设备状态)/i.test(combinedText),
        missingDataLabels: [],
        multiProjectData: uniqueOrgIds.size > 1,
        passengerFlowData: /(客流|traffic|flowcount|passenger)/i.test(combinedText),
        publicAreaData: /(公区|publicarea|common area)/i.test(combinedText),
        rankingData: uniqueOrgIds.size > 1,
        singleMeterData: hasDeviceFields &&
            (records.length === 1 ||
                /deviceid|meterid|devicenumber|metername/.test(payloadText) ||
                /单电表|电表|表计|回路/.test(normalizeText(input.context?.queryName))),
        targetData: /(budget|target|baseline|考核|目标|bsc)/i.test(combinedText),
        tenantData: /(租户|tenant)/i.test(combinedText),
        timeSeriesData: records.length > 0 &&
            records.some((record) => ['sampleTime', 'hour', 'day', 'month', 'year', 'totalOne', 'totalTwo'].some((key) => key in record)),
        weatherData: /(weather|temperature|humidity|temp|天气|温度|湿度)/i.test(combinedText),
    };
    if (availability.energyData) {
        availability.availableDataLabels.push(`${energyType || '能源'}用量数据`);
    }
    if (availability.timeSeriesData) {
        availability.availableDataLabels.push('时序趋势数据');
    }
    if (availability.multiProjectData) {
        availability.availableDataLabels.push('多项目对比数据');
    }
    if (availability.singleMeterData) {
        availability.availableDataLabels.push('单电表诊断数据');
    }
    if (availability.weatherData) {
        availability.availableDataLabels.push('天气温湿度数据');
    }
    if (availability.passengerFlowData) {
        availability.availableDataLabels.push('客流数据');
    }
    if (availability.equipmentRuntimeData) {
        availability.availableDataLabels.push('设备运行数据');
    }
    if (availability.areaData) {
        availability.availableDataLabels.push('建筑面积数据');
    }
    if (availability.targetData) {
        availability.availableDataLabels.push('预算/考核目标数据');
    }
    if (availability.tenantData) {
        availability.availableDataLabels.push('租户侧数据');
    }
    if (availability.publicAreaData) {
        availability.availableDataLabels.push('公区侧数据');
    }
    if (!availability.weatherData) {
        availability.missingDataLabels.push('天气/温湿度相关分析');
    }
    if (!availability.passengerFlowData) {
        availability.missingDataLabels.push('客流及单客流能耗分析');
    }
    if (!availability.equipmentRuntimeData) {
        availability.missingDataLabels.push('设备运行时长和系统运行分析');
    }
    if (!availability.areaData) {
        availability.missingDataLabels.push('单方能耗和面积相关分析');
    }
    if (!availability.targetData) {
        availability.missingDataLabels.push('预算目标、考核目标和双碳 BSC 偏差分析');
    }
    if (!availability.tenantData) {
        availability.missingDataLabels.push('租户侧分析');
    }
    if (!availability.publicAreaData) {
        availability.missingDataLabels.push('公区侧分析');
    }
    if (!availability.rankingData) {
        availability.missingDataLabels.push('项目排行、TOP 榜单和多项目横向比较');
    }
    if (!availability.timeSeriesData) {
        availability.missingDataLabels.push('趋势分析、峰谷分析和异常时段分析');
    }
    return availability;
};
export const buildReportTemplatePromptContext = (input) => {
    const selection = selectReportTemplate(input);
    const availability = analyzeReportDataAvailability(input);
    return {
        availability,
        selection,
    };
};
