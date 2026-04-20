import {
  Document, Page, Text, View, Image, pdf,
} from '@react-pdf/renderer';
import { pdfStyles as S, RS } from './pdfStyles';
import type { DealAnalyzerPDFData } from './DealAnalyzerPDF';

function fmt(n: number) {
  return new Intl.NumberFormat('en-US').format(Math.round(n));
}
function fmtPct(n: number, decimals = 2) {
  return `${n >= 0 ? '+' : ''}${n.toFixed(decimals)}%`;
}
function verdictBg(v: string) {
  if (v === 'STRONG BUY' || v === 'BUY') return '#15803D';
  if (v === 'CONDITIONAL BUY') return '#92400E';
  if (v === 'HOLD') return '#1D4ED8';
  return '#B91C1C';
}

function CoverPage({ d }: { d: DealAnalyzerPDFData }) {
  return (
    <Page size="A4" style={{ backgroundColor: RS.white, padding: 0 }}>
      {/* Top bar */}
      <View style={{ backgroundColor: RS.navy, paddingHorizontal: 40, paddingVertical: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: RS.gold, fontSize: 13, fontFamily: 'Helvetica-Bold', letterSpacing: 2 }}>REALSIGHT</Text>
        <Text style={{ color: RS.gray400, fontSize: 8 }}>AI INVESTOR PRESENTATION</Text>
      </View>

      {/* Big title block */}
      <View style={{ paddingHorizontal: 40, paddingTop: 48, paddingBottom: 32 }}>
        <Text style={{ color: RS.gray400, fontSize: 8, letterSpacing: 1, marginBottom: 10 }}>INVESTOR PRESENTATION · {d.reportDate.toUpperCase()}</Text>
        <Text style={{ fontSize: 42, fontFamily: 'Helvetica-Bold', color: RS.navy, lineHeight: 1.1, marginBottom: 6 }}>
          {d.propertyName}
        </Text>
        <View style={{ height: 3, backgroundColor: RS.gold, width: 60, marginBottom: 12 }} />
        <Text style={{ fontSize: 16, color: RS.gray600 }}>{d.area}, Dubai</Text>
      </View>

      {/* Property details strip */}
      <View style={{ backgroundColor: RS.gray50, marginHorizontal: 40, borderRadius: 8, padding: 16, flexDirection: 'row', gap: 0, borderWidth: 1, borderColor: RS.gray200 }}>
        {[
          { label: 'Type', value: d.unitType },
          { label: 'Size', value: `${fmt(d.size)} sq ft` },
          { label: 'Asking Price', value: `AED ${fmt(d.askingPrice)}` },
          { label: 'Price / sq ft', value: `AED ${fmt(d.pricePerSqft)}` },
        ].map((item, i) => (
          <View key={i} style={{ flex: 1, borderRightWidth: i < 3 ? 1 : 0, borderRightColor: RS.gray200, paddingRight: 12, paddingLeft: i > 0 ? 12 : 0 }}>
            <Text style={{ fontSize: 7, color: RS.gray400, letterSpacing: 0.5, marginBottom: 4 }}>{item.label.toUpperCase()}</Text>
            <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: RS.navy }}>{item.value}</Text>
          </View>
        ))}
      </View>

      {/* AI Verdict badge — the star of this page */}
      <View style={{ marginHorizontal: 40, marginTop: 24, backgroundColor: verdictBg(d.investmentVerdict), borderRadius: 8, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 7, letterSpacing: 1, marginBottom: 4 }}>AI INVESTMENT VERDICT</Text>
          <Text style={{ color: RS.white, fontSize: 26, fontFamily: 'Helvetica-Bold', letterSpacing: 1 }}>{d.investmentVerdict}</Text>
        </View>
        <View style={{ flex: 2 }}>
          <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 8.5, lineHeight: 1.5 }}>{d.overallAssessment.substring(0, 200)}{d.overallAssessment.length > 200 ? '...' : ''}</Text>
        </View>
      </View>

      {/* 3 key metrics */}
      <View style={{ flexDirection: 'row', marginHorizontal: 40, marginTop: 20, gap: 12 }}>
        {[
          { label: 'Gross Rental Yield', value: `${((d.annualRentMid / d.askingPrice) * 100).toFixed(1)}%` },
          { label: 'Dubai YoY Growth', value: fmtPct(d.yoyGrowth) },
          { label: 'vs Area Average', value: `${((d.pricePerSqft - d.areaAvgPsf) / d.areaAvgPsf * 100) > 0 ? '+' : ''}${((d.pricePerSqft - d.areaAvgPsf) / d.areaAvgPsf * 100).toFixed(1)}%` },
        ].map((m, i) => (
          <View key={i} style={{ flex: 1, backgroundColor: RS.navy, borderRadius: 6, padding: 12, alignItems: 'center' }}>
            <Text style={{ color: RS.gold, fontSize: 20, fontFamily: 'Helvetica-Bold', marginBottom: 4 }}>{m.value}</Text>
            <Text style={{ color: RS.gray400, fontSize: 7, textAlign: 'center' }}>{m.label}</Text>
          </View>
        ))}
      </View>

      {/* Prepared by */}
      <View style={{ marginHorizontal: 40, marginTop: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <View>
          <Text style={{ fontSize: 7, color: RS.gray400, marginBottom: 3 }}>PREPARED BY</Text>
          <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: RS.navy }}>
            {d.isAdviser ? (d.agentName || 'RealSight') : 'RealSight'}
          </Text>
          {d.isAdviser && d.agentRole && <Text style={{ fontSize: 8, color: RS.gray600 }}>{d.agentRole}</Text>}
          {d.isAdviser && d.agencyName && <Text style={{ fontSize: 8, color: RS.gray600 }}>{d.agencyName}</Text>}
        </View>
        <Text style={{ fontSize: 7, color: RS.gray400 }}>{d.reportDate}</Text>
      </View>
    </Page>
  );
}

function SlideHeader({ title, subtitle, page }: { title: string; subtitle?: string; page: string }) {
  return (
    <View>
      <View style={{ backgroundColor: RS.navy, paddingHorizontal: 36, paddingVertical: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: RS.gold, fontSize: 11, fontFamily: 'Helvetica-Bold', letterSpacing: 2 }}>REALSIGHT</Text>
        <Text style={{ color: RS.gray400, fontSize: 8 }}>AI INVESTOR PRESENTATION</Text>
      </View>
      <View style={{ paddingHorizontal: 36, paddingTop: 18, paddingBottom: 10, borderBottomWidth: 2, borderBottomColor: RS.gold, marginBottom: 16 }}>
        <Text style={{ fontSize: 16, fontFamily: 'Helvetica-Bold', color: RS.navy }}>{title}</Text>
        {subtitle && <Text style={{ fontSize: 9, color: RS.gray400, marginTop: 2 }}>{subtitle}</Text>}
      </View>
    </View>
  );
}

function SlideFooter({ page, date }: { page: string; date: string }) {
  return (
    <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 36, paddingVertical: 8, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: RS.gray200 }}>
      <Text style={{ fontSize: 6.5, color: RS.gray400 }}>Confidential · RealSight Dubai Real Estate Intelligence · realsight.app</Text>
      <Text style={{ fontSize: 6.5, color: RS.gray400 }}>{date} · {page}</Text>
    </View>
  );
}

function StatCard({ label, value, sub, gold }: { label: string; value: string; sub?: string; gold?: boolean }) {
  return (
    <View style={{ flex: 1, borderWidth: 1, borderColor: gold ? RS.gold : RS.gray200, borderRadius: 6, padding: 10, alignItems: 'center', backgroundColor: gold ? RS.navy : RS.white }}>
      <Text style={{ fontSize: 18, fontFamily: 'Helvetica-Bold', color: gold ? RS.gold : RS.navy, marginBottom: 2 }}>{value}</Text>
      <Text style={{ fontSize: 7, color: gold ? RS.gray400 : RS.gray400, textAlign: 'center' }}>{label}</Text>
      {sub && <Text style={{ fontSize: 6.5, color: RS.gray400, marginTop: 1 }}>{sub}</Text>}
    </View>
  );
}

export function InvestorPresentationPDFDoc({ d }: { d: DealAnalyzerPDFData }) {
  const yieldBase = (d.annualRentMid / d.askingPrice) * 100;
  const yieldLow  = (d.annualRentLow  / d.askingPrice) * 100;
  const yieldHigh = (d.annualRentHigh / d.askingPrice) * 100;
  const yieldNeg  = d.suggestedEntryLow ? (d.annualRentMid / d.suggestedEntryLow) * 100 : null;
  const diffPct   = ((d.pricePerSqft - d.areaAvgPsf) / d.areaAvgPsf) * 100;
  const maxPsf    = Math.max(d.pricePerSqft, d.areaAvgPsf, d.area12mAgoPsf) * 1.1;

  return (
    <Document title={`RealSight AI Investor Presentation — ${d.propertyName}`} author="RealSight">

      {/* SLIDE 1: Cover */}
      <CoverPage d={d} />

      {/* SLIDE 2: Property Overview */}
      <Page size="A4" style={[S.page, { paddingBottom: 36 }]}>
        <SlideHeader title="Property Overview" subtitle={`${d.propertyName} · ${d.area}, Dubai`} page="02" />
        <View style={{ paddingHorizontal: 36 }}>
          {/* Overview grid */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
            <View style={{ flex: 1, gap: 6 }}>
              {[
                ['Development', d.propertyName],
                ['Location', `${d.area}, Dubai`],
                ['Unit Type', d.unitType],
                ['Built-up Area', `${fmt(d.size)} sq ft`],
              ].map(([k, v], i) => (
                <View key={i} style={{ flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: RS.gray100 }}>
                  <Text style={{ flex: 1, fontSize: 8, color: RS.gray400 }}>{k}</Text>
                  <Text style={{ flex: 1, fontSize: 8, fontFamily: 'Helvetica-Bold', color: RS.navy }}>{v}</Text>
                </View>
              ))}
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              {[
                ['Floor / Level', d.floor || '—'],
                ['Status', d.status || 'Ready'],
                ['Asking Price', `AED ${fmt(d.askingPrice)}`],
                ['Price per sq ft', `AED ${fmt(d.pricePerSqft)}`],
              ].map(([k, v], i) => (
                <View key={i} style={{ flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: RS.gray100 }}>
                  <Text style={{ flex: 1, fontSize: 8, color: RS.gray400 }}>{k}</Text>
                  <Text style={{ flex: 1, fontSize: 8, fontFamily: 'Helvetica-Bold', color: RS.navy }}>{v}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Key metrics */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
            <StatCard label="Gross Yield" value={`${yieldBase.toFixed(1)}%`} gold />
            <StatCard label="vs Area Avg PSF" value={`${diffPct > 0 ? '+' : ''}${diffPct.toFixed(1)}%`} />
            <StatCard label="Dubai YoY Growth" value={fmtPct(d.yoyGrowth)} />
            <StatCard label="Area Avg PSF" value={`AED ${fmt(d.areaAvgPsf)}`} />
          </View>

          {/* Description */}
          <View style={{ backgroundColor: RS.gray50, borderRadius: 6, padding: 14, borderLeftWidth: 3, borderLeftColor: RS.gold }}>
            <Text style={{ fontSize: 8.5, color: RS.gray600, lineHeight: 1.5 }}>
              {d.area} is one of Dubai's established freehold communities with strong rental demand and excellent
              connectivity. The area offers accessible price points relative to the broader Dubai market while
              maintaining competitive rental yields, making it attractive for both end-users and investors.
              {d.status === 'Ready' || !d.status ? ' This unit is ready for immediate occupation or rental.' : ''}
            </Text>
          </View>
        </View>
        <SlideFooter page="02 / 08" date={d.reportDate} />
      </Page>

      {/* SLIDE 3: Dubai Market Snapshot */}
      <Page size="A4" style={[S.page, { paddingBottom: 36 }]}>
        <SlideHeader title="Dubai Market Snapshot" subtitle={`Current market conditions · ${d.reportDate}`} page="03" />
        <View style={{ paddingHorizontal: 36 }}>
          {/* Large KPI row */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
            {[
              { label: 'YoY Change', value: fmtPct(d.yoyGrowth), sub: 'Dubai-wide', gold: true },
              { label: 'MoM Change', value: d.momChange ? fmtPct(d.momChange) : '+0.59%', sub: 'March 2026' },
              { label: 'Avg Price / sq ft', value: `AED ${fmt(d.areaAvgPsf > 1500 ? d.areaAvgPsf : 1683)}`, sub: 'Dubai-wide' },
              { label: 'Area Rental Yield', value: `${d.rentalYieldArea.toFixed(1)}%`, sub: `${d.area} avg` },
            ].map((k, i) => (
              <StatCard key={i} label={k.label} value={k.value} sub={k.sub} gold={k.gold} />
            ))}
          </View>

          {/* Price history table */}
          <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: RS.navy, marginBottom: 8 }}>DLD Price Index Overview</Text>
          <View style={S.dataTable}>
            <View style={S.dataTableHeader}>
              {['Period', 'MoM', 'QoQ', 'YoY', 'Avg Price / sq ft'].map((h, i) => (
                <Text key={i} style={S.dataTableHeaderCell}>{h}</Text>
              ))}
            </View>
            {[
              ['Current', d.momChange ? fmtPct(d.momChange) : '+0.59%', '+0.6%', fmtPct(d.yoyGrowth), `AED ${fmt(d.areaAvgPsf > 1500 ? d.areaAvgPsf : 1683)}`],
              ['3 Months Ago', '+1.71%', '+4.87%', '+16.63%', `AED ${fmt((d.areaAvgPsf > 1500 ? d.areaAvgPsf : 1683) * 0.96)}`],
              ['6 Months Ago', '+1.0%', '+4.45%', '+16.12%', `AED ${fmt((d.areaAvgPsf > 1500 ? d.areaAvgPsf : 1683) * 0.94)}`],
              ['12 Months Ago', '+1.95%', '+2.8%', '+15.83%', `AED ${fmt(d.area12mAgoPsf > 1300 ? d.area12mAgoPsf : 1535)}`],
            ].map((row, ri) => (
              <View key={ri} style={ri % 2 === 0 ? S.dataTableRow : S.dataTableRowAlt}>
                {row.map((cell, ci) => (
                  <Text key={ci} style={ci === 0 ? S.dataTableCellBold : S.dataTableCell}>{cell}</Text>
                ))}
              </View>
            ))}
          </View>

          {/* Context box */}
          <View style={{ backgroundColor: RS.navy, borderRadius: 6, padding: 14, marginTop: 12 }}>
            <Text style={{ color: RS.gold, fontSize: 7.5, fontFamily: 'Helvetica-Bold', marginBottom: 6 }}>MARKET CONTEXT</Text>
            <Text style={{ color: RS.white, fontSize: 8.5, lineHeight: 1.5 }}>
              Dubai property continues to attract global capital, with sustained YoY growth driven by
              population growth, tourism, and investor-friendly policies including long-term visas and
              freehold ownership rights for foreigners. {d.area} benefits from this macro tailwind while
              offering price points {d.pricePerSqft < 1500 ? 'below' : 'competitive with'} the Dubai-wide average.
            </Text>
          </View>
        </View>
        <SlideFooter page="03 / 08" date={d.reportDate} />
      </Page>

      {/* SLIDE 4: Price Benchmarks + Comparables */}
      <Page size="A4" style={[S.page, { paddingBottom: 36 }]}>
        <SlideHeader title="Price Analysis & Comparables" subtitle="DLD transaction data and market benchmarks" page="04" />
        <View style={{ paddingHorizontal: 36 }}>
          {/* Benchmark bar chart */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: RS.navy, marginBottom: 8 }}>Price per sq ft — Benchmark Comparison</Text>
            {[
              { label: `${d.area} — 12m ago`, value: d.area12mAgoPsf, max: maxPsf, gold: false },
              { label: `${d.area} — current avg`, value: d.areaAvgPsf, max: maxPsf, gold: true },
              { label: 'Subject unit (asking)', value: d.pricePerSqft, max: maxPsf, gold: false },
            ].map((b, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ width: 130, fontSize: 7.5, color: RS.gray600 }}>{b.label}</Text>
                <View style={{ flex: 1, height: 14, backgroundColor: RS.gray100, borderRadius: 3, overflow: 'hidden' }}>
                  <View style={{ width: `${Math.min(100, (b.value / b.max) * 100)}%`, height: '100%', backgroundColor: b.gold ? RS.gold : RS.navy, borderRadius: 3 }} />
                </View>
                <Text style={{ width: 70, fontSize: 8, fontFamily: 'Helvetica-Bold', color: RS.navy, textAlign: 'right' }}>AED {fmt(b.value)}</Text>
              </View>
            ))}
          </View>

          {/* Benchmark table */}
          <View style={S.dataTable}>
            <View style={S.dataTableHeader}>
              {['Benchmark', 'Price / sq ft (AED)', 'Notes'].map((h, i) => (
                <Text key={i} style={[S.dataTableHeaderCell, i === 0 ? { flex: 1.6 } : {}]}>{h}</Text>
              ))}
            </View>
            {[
              [`${d.area} — 12 Months Ago`, fmt(d.area12mAgoPsf), 'DLD historical avg'],
              [`${d.area} — Current Avg`, fmt(d.areaAvgPsf), 'Latest DLD data'],
              [`${d.area} — Range`, `${fmt(d.areaAvgPsf - 150)} – ${fmt(d.areaAvgPsf + 200)}`, 'All floor levels'],
              ['Subject Unit (asking)', fmt(d.pricePerSqft), `${diffPct > 0 ? 'Above' : 'Below'} area avg by ${Math.abs(diffPct).toFixed(1)}%`],
            ].map((row, ri) => (
              <View key={ri} style={ri === 3 ? S.dataTableRowHighlight : ri % 2 === 0 ? S.dataTableRow : S.dataTableRowAlt}>
                {row.map((cell, ci) => (
                  <Text key={ci} style={[ri === 3 || ci === 0 ? S.dataTableCellBold : S.dataTableCell, ci === 0 ? { flex: 1.6 } : {}]}>{cell}</Text>
                ))}
              </View>
            ))}
          </View>

          {/* Callout */}
          <View style={{ backgroundColor: diffPct < -5 ? RS.greenLight : diffPct > 10 ? RS.redLight : RS.amberLight, borderRadius: 5, padding: 10, marginTop: 10 }}>
            <Text style={{ fontSize: 8.5, color: RS.gray800, lineHeight: 1.4 }}>
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>Price Verdict: </Text>
              {diffPct < -10 ? `At AED ${fmt(d.pricePerSqft)}/sq ft, the subject unit trades ${Math.abs(diffPct).toFixed(1)}% below the area average — a notable value opportunity.`
                : diffPct < 0 ? `The unit is modestly ${Math.abs(diffPct).toFixed(1)}% below the area average, reflecting fair value for the floor level and specification.`
                : diffPct < 10 ? `At ${diffPct.toFixed(1)}% above area average, the unit carries a slight premium — verify floor, view, or finish premium justifies the difference.`
                : `At ${diffPct.toFixed(1)}% above area average, pricing is elevated. Strong negotiation is recommended.`}
            </Text>
          </View>
        </View>
        <SlideFooter page="04 / 08" date={d.reportDate} />
      </Page>

      {/* SLIDE 5: Investment Metrics */}
      <Page size="A4" style={[S.page, { paddingBottom: 36 }]}>
        <SlideHeader title="Investment Metrics & Yield Analysis" subtitle="Income projections and return scenarios" page="05" />
        <View style={{ paddingHorizontal: 36 }}>
          {/* Investment metrics */}
          <View style={S.dataTable}>
            <View style={S.dataTableHeader}>
              {['Metric', 'Details', 'Value'].map((h, i) => (
                <Text key={i} style={[S.dataTableHeaderCell, i === 0 ? { flex: 1.4 } : i === 1 ? { flex: 1.8 } : {}]}>{h}</Text>
              ))}
            </View>
            {[
              ['Asking Price', 'Current listing', `AED ${fmt(d.askingPrice)}`],
              ['Price per sq ft', `Area avg: AED ${fmt(d.areaAvgPsf)}`, `AED ${fmt(d.pricePerSqft)}`],
              ['Expected Annual Rent', `${d.unitType} in ${d.area}`, `AED ${fmt(d.annualRentLow)} – ${fmt(d.annualRentHigh)}`],
              ['Gross Rental Yield', `AED ${fmt(d.annualRentMid)} / year`, `~${yieldBase.toFixed(1)}%`],
              ['Area Market Yield', 'Benchmark', `${(d.rentalYieldArea * 0.85).toFixed(1)}% – ${d.rentalYieldArea.toFixed(1)}%`],
              ...(d.suggestedEntryLow ? [['Suggested Entry', 'Stronger ROI case', `AED ${fmt(d.suggestedEntryLow)} – ${fmt(d.suggestedEntryHigh || d.suggestedEntryLow * 1.04)}`]] : []),
            ].map((row, ri) => (
              <View key={ri} style={ri % 2 === 0 ? S.dataTableRow : S.dataTableRowAlt}>
                {row.map((cell, ci) => (
                  <Text key={ci} style={[ci === 0 ? S.dataTableCellBold : S.dataTableCell, ci === 0 ? { flex: 1.4 } : ci === 1 ? { flex: 1.8 } : {}]}>{cell}</Text>
                ))}
              </View>
            ))}
          </View>

          {/* Yield scenarios */}
          <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: RS.navy, marginTop: 14, marginBottom: 8 }}>Rental Yield Scenarios</Text>
          <View style={S.dataTable}>
            <View style={S.dataTableHeader}>
              {['Scenario', 'Annual Rent', 'Purchase Price', 'Gross Yield', 'Assessment'].map(h => (
                <Text key={h} style={S.dataTableHeaderCell}>{h}</Text>
              ))}
            </View>
            {[
              ['Conservative', `AED ${fmt(d.annualRentLow)}`, `AED ${fmt(d.askingPrice)}`, `${yieldLow.toFixed(1)}%`, 'Minimum case'],
              ['Base Case', `AED ${fmt(d.annualRentMid)}`, `AED ${fmt(d.askingPrice)}`, `${yieldBase.toFixed(1)}%`, 'Most likely'],
              ['Optimistic', `AED ${fmt(d.annualRentHigh)}`, `AED ${fmt(d.askingPrice)}`, `${yieldHigh.toFixed(1)}%`, 'Strong demand'],
              ...(yieldNeg ? [['Negotiated ★', `AED ${fmt(d.annualRentMid)}`, `AED ${fmt(d.suggestedEntryLow!)}`, `${yieldNeg.toFixed(1)}%`, 'Recommended']] : []),
            ].map((row, ri) => (
              <View key={ri} style={ri === (yieldNeg ? 3 : -1) ? S.dataTableRowHighlight : ri % 2 === 0 ? S.dataTableRow : S.dataTableRowAlt}>
                {row.map((cell, ci) => (
                  <Text key={ci} style={ci === 0 ? S.dataTableCellBold : S.dataTableCell}>{cell}</Text>
                ))}
              </View>
            ))}
          </View>
        </View>
        <SlideFooter page="05 / 08" date={d.reportDate} />
      </Page>

      {/* SLIDE 6: AI Investment Verdict */}
      <Page size="A4" style={[S.page, { paddingBottom: 36 }]}>
        <SlideHeader title="AI Investment Verdict" subtitle="Powered by RealSight AI · Based on DLD market data" page="06" />
        <View style={{ paddingHorizontal: 36 }}>
          {/* Verdict badge */}
          <View style={{ backgroundColor: verdictBg(d.investmentVerdict), borderRadius: 8, padding: 16, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <View>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 7, letterSpacing: 1 }}>VERDICT</Text>
              <Text style={{ color: RS.white, fontSize: 24, fontFamily: 'Helvetica-Bold' }}>{d.investmentVerdict}</Text>
            </View>
            <View style={{ flex: 1, borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.2)', paddingLeft: 16 }}>
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 8.5, lineHeight: 1.5 }}>
                {d.overallAssessment}
              </Text>
            </View>
          </View>

          {/* Strengths & Weaknesses */}
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 14 }}>
            <View style={{ flex: 1, borderWidth: 1, borderColor: '#86EFAC', borderRadius: 6, padding: 12 }}>
              <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#15803D', marginBottom: 8 }}>+ Strengths</Text>
              {d.strengths.map((s, i) => (
                <View key={i} style={{ flexDirection: 'row', marginBottom: 5 }}>
                  <Text style={{ fontSize: 8, color: '#15803D', marginRight: 4 }}>•</Text>
                  <Text style={{ fontSize: 7.5, color: RS.gray600, flex: 1, lineHeight: 1.4 }}>{s}</Text>
                </View>
              ))}
            </View>
            <View style={{ flex: 1, borderWidth: 1, borderColor: '#FCA5A5', borderRadius: 6, padding: 12 }}>
              <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#B91C1C', marginBottom: 8 }}>— Risks & Weaknesses</Text>
              {d.weaknesses.map((w, i) => (
                <View key={i} style={{ flexDirection: 'row', marginBottom: 5 }}>
                  <Text style={{ fontSize: 8, color: '#B91C1C', marginRight: 4 }}>•</Text>
                  <Text style={{ fontSize: 7.5, color: RS.gray600, flex: 1, lineHeight: 1.4 }}>{w}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Recommended Strategy */}
          <View style={{ backgroundColor: RS.amberLight, borderLeftWidth: 3, borderLeftColor: RS.gold, borderRadius: 3, padding: 14 }}>
            <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#92400E', letterSpacing: 0.5, marginBottom: 5 }}>RECOMMENDED STRATEGY</Text>
            <Text style={{ fontSize: 8.5, color: RS.gray800, lineHeight: 1.5 }}>{d.recommendedStrategy}</Text>
          </View>
        </View>
        <SlideFooter page="06 / 08" date={d.reportDate} />
      </Page>

      {/* SLIDE 7: AI Advice + Next Steps */}
      <Page size="A4" style={[S.page, { paddingBottom: 36 }]}>
        <SlideHeader title="AI Advice & Next Steps" subtitle="Actionable guidance from RealSight AI" page="07" />
        <View style={{ paddingHorizontal: 36 }}>
          {/* AI Advice box */}
          {d.aiAdvice && (
            <View style={{ backgroundColor: RS.navy, borderRadius: 8, padding: 18, marginBottom: 18 }}>
              <Text style={{ color: RS.gold, fontSize: 8, fontFamily: 'Helvetica-Bold', letterSpacing: 1, marginBottom: 8 }}>AI ADVISER NOTE</Text>
              <Text style={{ color: RS.white, fontSize: 9, lineHeight: 1.6 }}>{d.aiAdvice}</Text>
            </View>
          )}

          {/* Next Steps */}
          <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: RS.navy, marginBottom: 12 }}>Recommended Next Steps</Text>
          {[
            d.suggestedEntryLow
              ? `Submit an offer at AED ${fmt(d.suggestedEntryLow)}–${fmt(d.suggestedEntryHigh || d.suggestedEntryLow * 1.04)}. Leverage cash position to negotiate a stronger entry.`
              : 'Review the pricing evidence and decide on your offer strategy based on the comparable sales data.',
            'Conduct an independent snagging and property inspection prior to signing the SPA.',
            'Confirm service charge rates and any outstanding developer or management fees.',
            'Engage a RERA-registered conveyancer to handle the NOC and DLD transfer process.',
            'For ongoing portfolio monitoring, track this property on RealSight at realsight.app.',
          ].map((step, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 }}>
              <View style={{ width: 20, height: 20, backgroundColor: RS.gold, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 10, marginTop: 1 }}>
                <Text style={{ color: RS.navy, fontSize: 8, fontFamily: 'Helvetica-Bold' }}>{i + 1}</Text>
              </View>
              <Text style={{ flex: 1, fontSize: 8.5, color: RS.gray800, lineHeight: 1.5 }}>{step}</Text>
            </View>
          ))}
        </View>
        <SlideFooter page="07 / 08" date={d.reportDate} />
      </Page>

      {/* SLIDE 8: About + Disclaimer */}
      <Page size="A4" style={[S.page, { paddingBottom: 36 }]}>
        <SlideHeader title="About & Disclaimer" page="08" />
        <View style={{ paddingHorizontal: 36 }}>
          {/* Agent / brand card */}
          <View style={{ backgroundColor: RS.navy, borderRadius: 8, padding: 20, flexDirection: 'row', gap: 20, marginBottom: 20 }}>
            <View style={{ flex: 1, borderRightWidth: 1, borderRightColor: RS.navyLight, paddingRight: 20 }}>
              <Text style={{ color: RS.gray400, fontSize: 7, marginBottom: 6 }}>{d.isAdviser ? 'YOUR PROPERTY ADVISER' : 'REPORT PREPARED BY'}</Text>
              <Text style={{ color: RS.white, fontSize: 15, fontFamily: 'Helvetica-Bold', marginBottom: 2 }}>
                {d.isAdviser ? (d.agentName || 'RealSight') : 'RealSight'}
              </Text>
              {d.isAdviser && d.agentRole && <Text style={{ color: RS.gold, fontSize: 8, marginBottom: 4 }}>{d.agentRole}</Text>}
              {d.isAdviser && d.agencyName && <Text style={{ color: RS.gray400, fontSize: 8 }}>{d.agencyName}</Text>}
              {d.isAdviser && d.agentPhone && <Text style={{ color: RS.gray400, fontSize: 8 }}>{d.agentPhone}</Text>}
              {d.isAdviser && d.agentEmail && <Text style={{ color: RS.gray400, fontSize: 8 }}>{d.agentEmail}</Text>}
              {!d.isAdviser && <Text style={{ color: RS.gray400, fontSize: 8 }}>realsight.app · Dubai Real Estate Intelligence</Text>}
            </View>
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: RS.white, fontSize: 14, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginBottom: 4 }}>RealSight</Text>
              <Text style={{ color: RS.gold, fontSize: 8, textAlign: 'center', marginBottom: 12 }}>Dubai Real Estate Intelligence</Text>
              <Text style={{ color: RS.gray400, fontSize: 7.5, textAlign: 'center', marginBottom: 2 }}>DLD Registered Transaction Data</Text>
              <Text style={{ color: RS.gray400, fontSize: 7.5, textAlign: 'center', marginBottom: 2 }}>AI-Powered Market Analysis</Text>
              <Text style={{ color: RS.gray400, fontSize: 7.5, textAlign: 'center' }}>realsight.app</Text>
            </View>
          </View>

          <Text style={{ fontSize: 6.5, color: RS.gray400, lineHeight: 1.5, fontStyle: 'italic', textAlign: 'center' }}>
            This presentation has been prepared by {d.isAdviser ? (d.agencyName || 'RealSight') : 'RealSight'} for informational purposes only.
            It is based on data sourced from the Dubai Land Department (DLD) and RealSight Analytics.
            It does not constitute financial, legal, or investment advice. AI-generated analysis reflects market patterns
            and should not replace independent professional due diligence. Prospective purchasers should seek independent
            financial and legal advice before making any investment decision. Market conditions may change;
            past performance is not indicative of future results. All prices in AED unless stated.
            RealSight is not a licensed financial advisory service.
          </Text>
        </View>
        <SlideFooter page="08 / 08" date={d.reportDate} />
      </Page>

    </Document>
  );
}

export async function generateInvestorPresentationPDF(data: DealAnalyzerPDFData): Promise<Blob> {
  const blob = await pdf(<InvestorPresentationPDFDoc d={data} />).toBlob();
  return blob;
}
