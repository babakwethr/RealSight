import { StyleSheet, Font } from '@react-pdf/renderer';

// RealSight Brand Colors
export const RS = {
  navy:      '#0F1C2E',
  navyMid:   '#162436',
  navyLight: '#1E3A5F',
  gold:      '#C9A84C',
  goldLight: '#E8C97A',
  white:     '#FFFFFF',
  offWhite:  '#F7F9FC',
  gray50:    '#F8FAFC',
  gray100:   '#F1F5F9',
  gray200:   '#E2E8F0',
  gray400:   '#94A3B8',
  gray600:   '#475569',
  gray800:   '#1E293B',
  green:     '#22C55E',
  greenLight:'#DCFCE7',
  red:       '#EF4444',
  redLight:  '#FEE2E2',
  amber:     '#F59E0B',
  amberLight:'#FEF3C7',
  blue:      '#3B82F6',
  blueLight: '#DBEAFE',
};

export const pdfStyles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    backgroundColor: RS.white,
    paddingTop: 0,
    paddingBottom: 40,
    paddingHorizontal: 0,
  },

  // ── Header / Footer ──────────────────────────────────────────
  pageHeader: {
    backgroundColor: RS.navy,
    paddingHorizontal: 36,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerBrandText: {
    color: RS.gold,
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 2,
  },
  headerTagline: {
    color: RS.gray400,
    fontSize: 7,
    letterSpacing: 1,
  },
  headerDate: {
    color: RS.gray400,
    fontSize: 8,
  },
  pageFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 36,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: RS.gray200,
  },
  footerText: {
    color: RS.gray400,
    fontSize: 7,
  },
  footerPage: {
    color: RS.gray400,
    fontSize: 7,
  },

  // ── Cover Page ───────────────────────────────────────────────
  coverPage: {
    backgroundColor: RS.navy,
    minHeight: '100%',
  },
  coverHeroArea: {
    backgroundColor: RS.navyMid,
    height: 220,
    justifyContent: 'flex-end',
    padding: 36,
  },
  coverBadge: {
    backgroundColor: RS.gold,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 3,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  coverBadgeText: {
    color: RS.navy,
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1.5,
  },
  coverTitle: {
    color: RS.white,
    fontSize: 32,
    fontFamily: 'Helvetica-Bold',
    lineHeight: 1.1,
  },
  coverSubtitle: {
    color: RS.gold,
    fontSize: 14,
    marginTop: 6,
  },
  coverDivider: {
    height: 2,
    backgroundColor: RS.gold,
    width: 48,
    marginTop: 14,
  },
  coverStatsRow: {
    flexDirection: 'row',
    paddingHorizontal: 36,
    paddingVertical: 20,
    gap: 0,
    borderBottomWidth: 1,
    borderBottomColor: RS.navyLight,
  },
  coverStatBox: {
    flex: 1,
    paddingRight: 20,
  },
  coverStatLabel: {
    color: RS.gray400,
    fontSize: 7,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  coverStatValue: {
    color: RS.white,
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
  },
  coverMetricsRow: {
    flexDirection: 'row',
    paddingHorizontal: 36,
    paddingVertical: 20,
    gap: 0,
  },
  coverMetric: {
    flex: 1,
    alignItems: 'center',
  },
  coverMetricValue: {
    color: RS.gold,
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
  },
  coverMetricLabel: {
    color: RS.gray400,
    fontSize: 7,
    marginTop: 3,
    textAlign: 'center',
  },
  coverAgentBox: {
    marginHorizontal: 36,
    marginTop: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: RS.navyLight,
    borderRadius: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  coverAgentLabel: {
    color: RS.gray400,
    fontSize: 7,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  coverAgentName: {
    color: RS.white,
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
  },
  coverAgentDetail: {
    color: RS.gray400,
    fontSize: 8,
    marginTop: 2,
  },
  coverDisclaimer: {
    marginHorizontal: 36,
    marginTop: 16,
  },
  coverDisclaimerText: {
    color: RS.gray600,
    fontSize: 6.5,
    fontStyle: 'italic',
  },

  // ── Content Pages ─────────────────────────────────────────────
  contentPadding: {
    paddingHorizontal: 36,
    paddingTop: 24,
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 4,
  },
  sectionHeaderBar: {
    width: 4,
    height: 14,
    backgroundColor: RS.gold,
    borderRadius: 2,
    marginRight: 8,
  },
  sectionHeaderText: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: RS.navy,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: RS.gray200,
    marginBottom: 12,
  },

  // Overview Table
  overviewTable: {
    borderWidth: 1,
    borderColor: RS.gray200,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 14,
  },
  overviewRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: RS.gray200,
  },
  overviewRowLast: {
    flexDirection: 'row',
  },
  overviewCell: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRightWidth: 1,
    borderRightColor: RS.gray200,
  },
  overviewCellLast: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  overviewLabel: {
    fontSize: 7,
    color: RS.gray400,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  overviewValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: RS.navy,
  },

  // KPI Cards Row
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  kpiCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: RS.gray200,
    borderRadius: 6,
    padding: 10,
    alignItems: 'center',
  },
  kpiCardHighlight: {
    flex: 1,
    backgroundColor: RS.navy,
    borderRadius: 6,
    padding: 10,
    alignItems: 'center',
  },
  kpiValue: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: RS.gold,
  },
  kpiValueDark: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: RS.white,
  },
  kpiLabel: {
    fontSize: 7,
    color: RS.gray400,
    marginTop: 3,
    textAlign: 'center',
  },
  kpiLabelLight: {
    fontSize: 7,
    color: RS.gray400,
    marginTop: 3,
    textAlign: 'center',
  },

  // Data Table
  dataTable: {
    marginBottom: 14,
  },
  dataTableHeader: {
    flexDirection: 'row',
    backgroundColor: RS.navy,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  dataTableHeaderCell: {
    color: RS.white,
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    flex: 1,
  },
  dataTableRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: RS.gray100,
  },
  dataTableRowAlt: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 8,
    backgroundColor: RS.gray50,
    borderBottomWidth: 1,
    borderBottomColor: RS.gray100,
  },
  dataTableRowHighlight: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 8,
    backgroundColor: RS.amberLight,
    borderBottomWidth: 1,
    borderBottomColor: RS.gray200,
  },
  dataTableCell: {
    flex: 1,
    fontSize: 8,
    color: RS.gray800,
  },
  dataTableCellBold: {
    flex: 1,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: RS.navy,
  },
  dataTableSummary: {
    flexDirection: 'row',
    backgroundColor: RS.navy,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginTop: 2,
    borderRadius: 3,
  },
  dataTableSummaryCell: {
    flex: 1,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: RS.gold,
  },

  // Verdict / Assessment boxes
  verdictBox: {
    borderWidth: 1.5,
    borderColor: RS.navy,
    borderRadius: 6,
    padding: 14,
    marginBottom: 10,
  },
  verdictTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: RS.navy,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  verdictText: {
    fontSize: 8.5,
    color: RS.gray800,
    lineHeight: 1.5,
  },
  assessmentBox: {
    backgroundColor: RS.navy,
    borderRadius: 6,
    padding: 14,
    marginBottom: 10,
  },
  assessmentLabel: {
    color: RS.gold,
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  assessmentText: {
    color: RS.white,
    fontSize: 8.5,
    lineHeight: 1.5,
  },
  strategyBox: {
    backgroundColor: RS.amberLight,
    borderLeftWidth: 3,
    borderLeftColor: RS.gold,
    borderRadius: 3,
    padding: 12,
    marginBottom: 10,
  },
  strategyLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: RS.amber,
    letterSpacing: 0.5,
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  strategyText: {
    fontSize: 8.5,
    color: RS.gray800,
    lineHeight: 1.5,
  },

  // Strengths / Weaknesses 2-col
  swRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  swBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: RS.gray200,
    borderRadius: 5,
    padding: 10,
  },
  swHeader: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 6,
  },
  swItem: {
    flexDirection: 'row',
    marginBottom: 4,
    alignItems: 'flex-start',
  },
  swBullet: {
    fontSize: 8,
    marginRight: 4,
    marginTop: 1,
  },
  swText: {
    fontSize: 7.5,
    color: RS.gray600,
    flex: 1,
    lineHeight: 1.4,
  },

  // Next Steps
  nextStepsBox: {
    borderWidth: 1,
    borderColor: RS.gray200,
    borderRadius: 5,
    padding: 12,
    marginBottom: 10,
  },
  nextStepRow: {
    flexDirection: 'row',
    marginBottom: 5,
    alignItems: 'flex-start',
  },
  nextStepNum: {
    width: 16,
    height: 16,
    backgroundColor: RS.navy,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 1,
  },
  nextStepNumText: {
    color: RS.white,
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
  },
  nextStepText: {
    fontSize: 8,
    color: RS.gray800,
    flex: 1,
    lineHeight: 1.4,
  },

  // Scenario Table label
  scenarioGreen: {
    color: '#15803D',
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
  },
  scenarioAmber: {
    color: '#92400E',
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
  },

  // Info callout
  calloutBox: {
    backgroundColor: RS.blueLight,
    borderRadius: 4,
    padding: 10,
    marginBottom: 10,
  },
  calloutText: {
    fontSize: 8,
    color: '#1E40AF',
    lineHeight: 1.4,
  },

  // Two column layout
  twoCol: {
    flexDirection: 'row',
    gap: 14,
  },
  col: {
    flex: 1,
  },

  // Body text
  bodyText: {
    fontSize: 8.5,
    color: RS.gray600,
    lineHeight: 1.5,
    marginBottom: 10,
  },

  // Agent card (last page)
  agentCard: {
    backgroundColor: RS.navy,
    borderRadius: 8,
    padding: 20,
    flexDirection: 'row',
    gap: 20,
    marginBottom: 14,
  },
  agentLeft: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: RS.navyLight,
    paddingRight: 20,
  },
  agentRight: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  agentCardLabel: {
    color: RS.gray400,
    fontSize: 7,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  agentCardName: {
    color: RS.white,
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
  },
  agentCardRole: {
    color: RS.gold,
    fontSize: 8,
    marginBottom: 6,
  },
  agentCardDetail: {
    color: RS.gray400,
    fontSize: 8,
    marginBottom: 2,
  },
  agentBrandName: {
    color: RS.white,
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  agentBrandTagline: {
    color: RS.gold,
    fontSize: 8,
    textAlign: 'center',
    marginBottom: 10,
  },
  agentBrandItem: {
    color: RS.gray400,
    fontSize: 7.5,
    textAlign: 'center',
    marginBottom: 2,
  },

  // Disclaimer
  disclaimer: {
    fontSize: 6.5,
    color: RS.gray400,
    lineHeight: 1.4,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 10,
  },

  // Photo grid
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  photoItem: {
    width: '31%',
    height: 80,
    backgroundColor: RS.gray100,
    borderRadius: 4,
  },

  // Chart bar (manual SVG-like)
  chartContainer: {
    marginBottom: 14,
    borderWidth: 1,
    borderColor: RS.gray200,
    borderRadius: 5,
    padding: 10,
  },
  chartBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  chartBarLabel: {
    width: 90,
    fontSize: 7,
    color: RS.gray600,
  },
  chartBarTrack: {
    flex: 1,
    height: 10,
    backgroundColor: RS.gray100,
    borderRadius: 3,
    overflow: 'hidden',
  },
  chartBarFill: {
    height: '100%',
    backgroundColor: RS.navy,
    borderRadius: 3,
  },
  chartBarFillGold: {
    height: '100%',
    backgroundColor: RS.gold,
    borderRadius: 3,
  },
  chartBarValue: {
    width: 60,
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: RS.navy,
    textAlign: 'right',
  },

  // Verdict badge
  verdictBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 4,
    marginBottom: 10,
  },
  verdictBadgeText: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1,
  },

  spacer: { height: 12 },
  spacerSm: { height: 6 },
});
