import {
  Document, Page, Text, View, Image, pdf,
} from '@react-pdf/renderer';
import { pdfStyles as S, RS } from './pdfStyles';
import type { DealAnalyzerPDFData } from './DealAnalyzerPDF';
import { imageToDataUrl } from '@/lib/imageToDataUrl';

/**
 * fetchProxiedImageAsDataUrl — pulls a listing photo through our
 * proxy-image edge function (which adds permissive CORS headers) and
 * returns it as a base64 data URI.
 *
 * Why a separate helper from imageToDataUrl: the Supabase function
 * gateway requires the anon `apikey` header on every call (even for
 * public functions). Plain fetch without the header gets a 401.
 * imageToDataUrl is a generic helper so it doesn't know about that.
 */
async function fetchProxiedImageAsDataUrl(url: string): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith('data:')) return url;
  const supaUrl = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined;
  const supaAnon = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!supaUrl || !supaAnon) return null;
  try {
    const proxyUrl = `${supaUrl}/functions/v1/proxy-image?url=${encodeURIComponent(url)}`;
    const r = await fetch(proxyUrl, { headers: { apikey: supaAnon } });
    if (!r.ok) {
      console.warn('[fetchProxiedImageAsDataUrl] proxy returned', r.status);
      return null;
    }
    const blob = await r.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn('[fetchProxiedImageAsDataUrl] fetch failed', e);
    return null;
  }
}

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
  // White-label: when isAdviser + agencyName provided, swap RealSight masthead for the adviser's brand.
  const brandLabel = (d.isAdviser && d.agencyName ? d.agencyName : 'RealSight').toUpperCase();
  return (
    <Page size="A4" style={{ backgroundColor: RS.white, padding: 0 }}>
      {/* Cinematic Dubai banner — replaces the flat navy bar that
          used to sit at the top. The skyline image is pre-fetched
          to a base64 data URI in generateInvestorPresentationPDF
          so @react-pdf can embed it without any runtime fetch.
          The navy overlay keeps the brand label + gold/gray text
          fully legible, same pattern as DealAnalyzerPDF cover. */}
      <View style={{ position: 'relative', height: 100 }}>
        {d._dubaiSkyline && (
          <Image src={d._dubaiSkyline} style={{ width: '100%', height: 100, objectFit: 'cover' }} />
        )}
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 100, backgroundColor: 'rgba(7,4,15,0.78)' }} />
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 100, paddingHorizontal: 40, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: RS.gold, fontSize: 13, fontFamily: 'Helvetica-Bold', letterSpacing: 2 }}>{brandLabel}</Text>
          <Text style={{ color: RS.gray400, fontSize: 8 }}>AI INVESTOR PRESENTATION</Text>
        </View>
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

function SlideHeader({ title, subtitle, page, brandLabel }: { title: string; subtitle?: string; page: string; brandLabel?: string }) {
  return (
    <View>
      <View style={{ backgroundColor: RS.navy, paddingHorizontal: 36, paddingVertical: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: RS.gold, fontSize: 11, fontFamily: 'Helvetica-Bold', letterSpacing: 2 }}>{(brandLabel || 'REALSIGHT').toUpperCase()}</Text>
        <Text style={{ color: RS.gray400, fontSize: 8 }}>AI INVESTOR PRESENTATION</Text>
      </View>
      <View style={{ paddingHorizontal: 36, paddingTop: 18, paddingBottom: 10, borderBottomWidth: 2, borderBottomColor: RS.gold, marginBottom: 16 }}>
        <Text style={{ fontSize: 16, fontFamily: 'Helvetica-Bold', color: RS.navy }}>{title}</Text>
        {subtitle && <Text style={{ fontSize: 9, color: RS.gray400, marginTop: 2 }}>{subtitle}</Text>}
      </View>
    </View>
  );
}

function SlideFooter({ page, date, isAdviser, slug }: { page: string; date: string; isAdviser?: boolean; slug?: string }) {
  // Adviser-sent reports show the upsell line first ("Powered by
  // RealSight · realsight.app/a/{slug}") so any prospect skimming the
  // PDF sees a free marketing touchpoint. Direct investor downloads
  // keep the existing confidentiality line.
  const leftLine = isAdviser
    ? `Powered by RealSight · realsight.app${slug ? `/a/${slug}` : ''}`
    : 'Confidential · RealSight Dubai Real Estate Intelligence · realsight.app';
  return (
    <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 36, paddingVertical: 8, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: RS.gray200 }}>
      <Text style={{ fontSize: 6.5, color: RS.gray400 }}>{leftLine}</Text>
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

  // White-label brand swap: when the report is rendered for an Adviser Pro tenant,
  // every slide's masthead carries their brand instead of "REALSIGHT". RealSight is
  // intentionally invisible — that's the deal advisers pay for.
  const brandLabel = d.isAdviser && d.agencyName ? d.agencyName : 'RealSight';

  // Slide layout (refactor 29 Apr 2026 per founder feedback — pages
  // 2-5 had too much empty space, combine into denser slides):
  //   01  Cover
  //   02  Property Overview + Dubai Market Snapshot (was 02 + 03)
  //   03  Pricing & Investment Analysis (was 04 + 05)
  //   04  AI Investment Verdict (was 06)
  //   05  Listing Gallery (conditional)
  //   05/06  AI Advice & Next Steps
  //   06/07  About + Disclaimer (full-page redesign)
  const hasGallery     = !!(d.photos && d.photos.length > 0);
  const total          = hasGallery ? '07' : '06';
  const pageStepsLabel = `${hasGallery ? '06' : '05'} / ${total}`;
  const pageAboutLabel = `${hasGallery ? '07' : '06'} / ${total}`;

  return (
    <Document title={`${brandLabel} — Investor Presentation · ${d.propertyName}`} author={brandLabel}>

      {/* SLIDE 1: Cover */}
      <CoverPage d={d} />

      {/* SLIDE 2 (combined): Property + Dubai Market Snapshot.
          Was two slides; founder QA flagged each as half-empty. The
          property attribute grid is two compact columns, then a 4-up
          KPI row mixes property metrics (yield) with Dubai-wide
          context (YoY, MoM, area yield), then a 3-row DLD index
          mini-table closes the slide. */}
      <Page size="A4" style={[S.page, { paddingBottom: 36 }]}>
        <SlideHeader title="Property & Market Snapshot" subtitle={`${d.propertyName} · ${d.area}, Dubai · ${d.reportDate}`} page="02" brandLabel={brandLabel} />
        <View style={{ paddingHorizontal: 36 }}>
          {/* Two-column attribute grid */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
            <View style={{ flex: 1, gap: 4 }}>
              {[
                ['Development', d.propertyName],
                ['Location', `${d.area}, Dubai`],
                ['Unit Type', d.unitType],
                ['Built-up Area', `${fmt(d.size)} sq ft`],
              ].map(([k, v], i) => (
                <View key={i} style={{ flexDirection: 'row', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: RS.gray100 }}>
                  <Text style={{ flex: 1, fontSize: 8, color: RS.gray400 }}>{k}</Text>
                  <Text style={{ flex: 1, fontSize: 8, fontFamily: 'Helvetica-Bold', color: RS.navy }}>{v}</Text>
                </View>
              ))}
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              {[
                ['Floor / Level', d.floor || '—'],
                ['Status', d.status || 'Ready'],
                ['Asking Price', `AED ${fmt(d.askingPrice)}`],
                ['Price per sq ft', `AED ${fmt(d.pricePerSqft)}`],
              ].map(([k, v], i) => (
                <View key={i} style={{ flexDirection: 'row', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: RS.gray100 }}>
                  <Text style={{ flex: 1, fontSize: 8, color: RS.gray400 }}>{k}</Text>
                  <Text style={{ flex: 1, fontSize: 8, fontFamily: 'Helvetica-Bold', color: RS.navy }}>{v}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Dubai-wide KPI row — pulls in market context. */}
          <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: RS.gray400, letterSpacing: 0.5, marginTop: 4, marginBottom: 6 }}>DUBAI MARKET CONTEXT</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            <StatCard label="Gross Yield (subject)" value={`${yieldBase.toFixed(1)}%`} gold />
            <StatCard label="vs Area Avg PSF" value={`${diffPct > 0 ? '+' : ''}${diffPct.toFixed(1)}%`} />
            <StatCard label="YoY Growth" value={fmtPct(d.yoyGrowth)} sub="Dubai-wide" />
            <StatCard label="Area Yield (avg)" value={`${d.rentalYieldArea.toFixed(1)}%`} sub={d.area} />
          </View>

          {/* Compact DLD price index — current + 12m ago for context */}
          <View style={S.dataTable}>
            <View style={S.dataTableHeader}>
              {['Period', 'MoM', 'YoY', 'Avg Price / sq ft'].map((h, i) => (
                <Text key={i} style={S.dataTableHeaderCell}>{h}</Text>
              ))}
            </View>
            {[
              ['Current', d.momChange ? fmtPct(d.momChange) : '+0.59%', fmtPct(d.yoyGrowth), `AED ${fmt(d.areaAvgPsf > 1500 ? d.areaAvgPsf : 1683)}`],
              ['6 Months Ago', '+1.0%', '+16.12%', `AED ${fmt((d.areaAvgPsf > 1500 ? d.areaAvgPsf : 1683) * 0.94)}`],
              ['12 Months Ago', '+1.95%', '+15.83%', `AED ${fmt(d.area12mAgoPsf > 1300 ? d.area12mAgoPsf : 1535)}`],
            ].map((row, ri) => (
              <View key={ri} style={ri % 2 === 0 ? S.dataTableRow : S.dataTableRowAlt}>
                {row.map((cell, ci) => (
                  <Text key={ci} style={ci === 0 ? S.dataTableCellBold : S.dataTableCell}>{cell}</Text>
                ))}
              </View>
            ))}
          </View>

          {/* Combined context box: area + Dubai macro */}
          <View style={{ backgroundColor: RS.navy, borderRadius: 6, padding: 12, marginTop: 10 }}>
            <Text style={{ color: RS.gold, fontSize: 7.5, fontFamily: 'Helvetica-Bold', marginBottom: 5 }}>WHY {d.area.toUpperCase()}</Text>
            <Text style={{ color: RS.white, fontSize: 8.5, lineHeight: 1.5 }}>
              {d.area} is one of Dubai's established freehold communities — strong rental demand,
              competitive yields, accessible price points relative to the wider city. Dubai's macro story
              (long-term visas, freehold for foreigners, sustained population + tourism growth) supports
              continued capital appreciation; this area benefits while offering pricing
              {d.pricePerSqft < 1500 ? ' below' : ' competitive with'} the Dubai-wide average.
            </Text>
          </View>
        </View>
        <SlideFooter page={`02 / ${total}`} date={d.reportDate} isAdviser={d.isAdviser} slug={d.tenantSlug} />
      </Page>

      {/* SLIDE 3 (combined): Pricing & Investment Analysis.
          Was two slides; founder QA flagged each as half-empty.
          One benchmark bar chart anchors the page; investment + yield
          tables sit side by side; verdict callout closes the slide. */}
      <Page size="A4" style={[S.page, { paddingBottom: 36 }]}>
        <SlideHeader title="Pricing & Investment Analysis" subtitle="DLD benchmarks · Yield scenarios · Negotiation guidance" page="03" brandLabel={brandLabel} />
        <View style={{ paddingHorizontal: 36 }}>
          {/* Compact benchmark bar chart */}
          <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: RS.gray400, letterSpacing: 0.5, marginBottom: 6 }}>PRICE PER SQ FT BENCHMARK</Text>
          <View style={{ marginBottom: 12 }}>
            {[
              { label: `${d.area} — 12m ago`, value: d.area12mAgoPsf, max: maxPsf, gold: false },
              { label: `${d.area} — current avg`, value: d.areaAvgPsf, max: maxPsf, gold: true },
              { label: 'Subject unit (asking)', value: d.pricePerSqft, max: maxPsf, gold: false },
            ].map((b, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ width: 130, fontSize: 7.5, color: RS.gray600 }}>{b.label}</Text>
                <View style={{ flex: 1, height: 12, backgroundColor: RS.gray100, borderRadius: 3, overflow: 'hidden' }}>
                  <View style={{ width: `${Math.min(100, (b.value / b.max) * 100)}%`, height: '100%', backgroundColor: b.gold ? RS.gold : RS.navy, borderRadius: 3 }} />
                </View>
                <Text style={{ width: 70, fontSize: 8, fontFamily: 'Helvetica-Bold', color: RS.navy, textAlign: 'right' }}>AED {fmt(b.value)}</Text>
              </View>
            ))}
          </View>

          {/* Two-column tables: investment metrics + yield scenarios */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: RS.gray400, letterSpacing: 0.5, marginBottom: 6 }}>INVESTMENT METRICS</Text>
              <View style={S.dataTable}>
                {[
                  ['Asking Price', `AED ${fmt(d.askingPrice)}`],
                  ['Price / sq ft', `AED ${fmt(d.pricePerSqft)}`],
                  ['Expected Rent', `AED ${fmt(d.annualRentMid)}/y`],
                  ['Gross Yield', `~${yieldBase.toFixed(1)}%`],
                  ...(d.suggestedEntryLow ? [['Suggested Entry', `AED ${fmt(d.suggestedEntryLow)}`]] : []),
                ].map((row, ri) => (
                  <View key={ri} style={ri % 2 === 0 ? S.dataTableRow : S.dataTableRowAlt}>
                    {row.map((cell, ci) => (
                      <Text key={ci} style={ci === 0 ? S.dataTableCellBold : S.dataTableCell}>{cell}</Text>
                    ))}
                  </View>
                ))}
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: RS.gray400, letterSpacing: 0.5, marginBottom: 6 }}>YIELD SCENARIOS</Text>
              <View style={S.dataTable}>
                <View style={S.dataTableHeader}>
                  {['Scenario', 'Yield'].map((h, i) => (
                    <Text key={i} style={S.dataTableHeaderCell}>{h}</Text>
                  ))}
                </View>
                {[
                  ['Conservative', `${yieldLow.toFixed(1)}%`],
                  ['Base Case', `${yieldBase.toFixed(1)}%`],
                  ['Optimistic', `${yieldHigh.toFixed(1)}%`],
                  ...(yieldNeg ? [['Negotiated ★', `${yieldNeg.toFixed(1)}%`]] : []),
                ].map((row, ri) => (
                  <View key={ri} style={ri === (yieldNeg ? 3 : -1) ? S.dataTableRowHighlight : ri % 2 === 0 ? S.dataTableRow : S.dataTableRowAlt}>
                    {row.map((cell, ci) => (
                      <Text key={ci} style={ci === 0 ? S.dataTableCellBold : S.dataTableCell}>{cell}</Text>
                    ))}
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Price verdict callout */}
          <View style={{ backgroundColor: diffPct < -5 ? RS.greenLight : diffPct > 10 ? RS.redLight : RS.amberLight, borderRadius: 5, padding: 10 }}>
            <Text style={{ fontSize: 8.5, color: RS.gray800, lineHeight: 1.4 }}>
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>Price Verdict: </Text>
              {diffPct < -10 ? `At AED ${fmt(d.pricePerSqft)}/sq ft, the subject unit trades ${Math.abs(diffPct).toFixed(1)}% below the area average — a notable value opportunity.`
                : diffPct < 0 ? `The unit is modestly ${Math.abs(diffPct).toFixed(1)}% below the area average, reflecting fair value for the floor level and specification.`
                : diffPct < 10 ? `At ${diffPct.toFixed(1)}% above area average, the unit carries a slight premium — verify floor, view, or finish premium justifies the difference.`
                : `At ${diffPct.toFixed(1)}% above area average, pricing is elevated. Strong negotiation is recommended.`}
            </Text>
          </View>
        </View>
        <SlideFooter page={`03 / ${total}`} date={d.reportDate} isAdviser={d.isAdviser} slug={d.tenantSlug} />
      </Page>

      {/* SLIDE 4: AI Investment Verdict */}
      <Page size="A4" style={[S.page, { paddingBottom: 36 }]}>
        <SlideHeader title="AI Investment Verdict" subtitle="Powered by RealSight AI · Based on DLD market data" page="04" brandLabel={brandLabel} />
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
        <SlideFooter page={`04 / ${total}`} date={d.reportDate} isAdviser={d.isAdviser} slug={d.tenantSlug} />
      </Page>

      {/* SLIDE 5 (CONDITIONAL): Listing Gallery
          Renders only when the URL extractor returned at least one
          property photo from the listing source. Pre-fetched to base64
          in generateInvestorPresentationPDF so each Image component
          embeds without any runtime fetch. Single hero photo if only
          one is available, 2-column grid (cap 6) otherwise. */}
      {hasGallery && (
        <Page size="A4" style={[S.page, { paddingBottom: 36 }]}>
          <SlideHeader title="Listing Gallery" subtitle="Photos from the original listing" page="05" brandLabel={brandLabel} />
          <View style={{ paddingHorizontal: 36 }}>
            <Text style={{ fontSize: 9, color: RS.gray600, marginBottom: 12, lineHeight: 1.5 }}>
              The original listing imagery — useful for visualising layout, finishes and natural light alongside the price + yield analysis on the previous slides.
            </Text>
            {d.photos!.length === 1 ? (
              <Image
                src={d.photos![0]}
                style={{ width: '100%', height: 360, objectFit: 'cover', borderRadius: 6, backgroundColor: RS.gray200 }}
              />
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {d.photos!.slice(0, 6).map((url, i) => (
                  <Image
                    key={i}
                    src={url}
                    style={{ width: '49%', height: 175, objectFit: 'cover', borderRadius: 6, backgroundColor: RS.gray200 }}
                  />
                ))}
              </View>
            )}
            <Text style={{ fontSize: 7, color: RS.gray400, fontStyle: 'italic', textAlign: 'center', marginTop: 10 }}>
              Source: original listing · Photos remain the property of their respective owners.
            </Text>
          </View>
          <SlideFooter page={`05 / ${total}`} date={d.reportDate} isAdviser={d.isAdviser} slug={d.tenantSlug} />
        </Page>
      )}

      {/* SLIDE 5 / 6: AI Advice + Next Steps */}
      <Page size="A4" style={[S.page, { paddingBottom: 36 }]}>
        <SlideHeader title="AI Advice & Next Steps" subtitle="Actionable guidance from RealSight AI" page={hasGallery ? '06' : '05'} brandLabel={brandLabel} />
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
        <SlideFooter page={pageStepsLabel} date={d.reportDate} isAdviser={d.isAdviser} slug={d.tenantSlug} />
      </Page>

      {/* CLOSING SLIDE — full-page redesign 29 Apr 2026 per founder QA.
          Replaces the previous "About & Disclaimer" layout (which was
          just an agent card + a banner + a disclaimer block) with a
          proper closing page:
            ① Dubai marina hero (~240px) with overlaid brand mark and
               personal "prepared for you" framing
            ② Adviser identity panel — photo + name + role + agency
            ③ RERA verification strip — QR + BRN + verified-broker text
            ④ "Let's continue the conversation" CTA card with contact lines
            ⑤ Subtle disclaimer + "Powered by RealSight" footer line
          No SlideHeader at the top — the hero replaces it. */}
      <Page size="A4" style={[S.page, { padding: 0, paddingBottom: 36 }]}>
        {/* ① Hero banner */}
        <View style={{ position: 'relative', height: 220, backgroundColor: RS.navy }}>
          {d._dubaiMarina && (
            <Image src={d._dubaiMarina} style={{ width: '100%', height: 220, objectFit: 'cover' }} />
          )}
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(7,4,15,0.65)' }} />
          {/* Brand strip top */}
          <View style={{ position: 'absolute', top: 18, left: 36, right: 36, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: RS.gold, fontSize: 11, fontFamily: 'Helvetica-Bold', letterSpacing: 2 }}>{brandLabel.toUpperCase()}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 8, letterSpacing: 1 }}>THANK YOU</Text>
          </View>
          {/* Hero copy bottom */}
          <View style={{ position: 'absolute', bottom: 28, left: 36, right: 36 }}>
            <Text style={{ color: RS.gold, fontSize: 8, letterSpacing: 1.5, marginBottom: 6 }}>PREPARED EXCLUSIVELY FOR YOU</Text>
            <Text style={{ color: RS.white, fontSize: 24, fontFamily: 'Helvetica-Bold', lineHeight: 1.15, marginBottom: 4 }}>
              Your next move in Dubai.
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 9.5, lineHeight: 1.4, maxWidth: 380 }}>
              {d.propertyName} · {d.area} · Analysis dated {d.reportDate}
            </Text>
          </View>
        </View>

        {/* ② Adviser identity panel */}
        <View style={{ paddingHorizontal: 36, paddingTop: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18, marginBottom: 18 }}>
            {d.isAdviser ? (
              d.agentPhotoUrl ? (
                <Image src={d.agentPhotoUrl} style={{ width: 72, height: 72, borderRadius: 36, objectFit: 'cover', borderWidth: 3, borderColor: RS.gold }} />
              ) : (
                <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: RS.gray100, borderWidth: 3, borderColor: RS.gold, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 26, fontFamily: 'Helvetica-Bold', color: RS.gold }}>
                    {(d.agentName || 'A').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )
            ) : (
              <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: RS.navy, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold', color: RS.gold }}>RS</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 8, color: RS.gray400, letterSpacing: 1, marginBottom: 4 }}>{d.isAdviser ? 'YOUR PROPERTY ADVISER' : 'REPORT PREPARED BY'}</Text>
              <Text style={{ fontSize: 19, fontFamily: 'Helvetica-Bold', color: RS.navy, marginBottom: 2 }}>
                {d.isAdviser ? (d.agentName || 'RealSight') : 'RealSight'}
              </Text>
              {d.isAdviser && d.agentRole && (
                <Text style={{ fontSize: 9, color: RS.gold, fontFamily: 'Helvetica-Bold', marginBottom: 2 }}>
                  {d.agentRole}{d.agencyName ? ` · ${d.agencyName}` : ''}
                </Text>
              )}
              {!d.isAdviser && (
                <Text style={{ fontSize: 9, color: RS.gold, fontFamily: 'Helvetica-Bold' }}>Dubai Real Estate Intelligence</Text>
              )}
            </View>
          </View>

          {/* Contact rows — phone / email / web. Only render lines we have. */}
          <View style={{ backgroundColor: RS.gray50, borderRadius: 6, padding: 14, marginBottom: 14, gap: 6 }}>
            {d.isAdviser && d.agentPhone && (
              <View style={{ flexDirection: 'row' }}>
                <Text style={{ width: 70, fontSize: 8, color: RS.gray400, letterSpacing: 0.5 }}>PHONE</Text>
                <Text style={{ flex: 1, fontSize: 10, color: RS.navy, fontFamily: 'Helvetica-Bold' }}>{d.agentPhone}</Text>
              </View>
            )}
            {d.isAdviser && d.agentEmail && (
              <View style={{ flexDirection: 'row' }}>
                <Text style={{ width: 70, fontSize: 8, color: RS.gray400, letterSpacing: 0.5 }}>EMAIL</Text>
                <Text style={{ flex: 1, fontSize: 10, color: RS.navy, fontFamily: 'Helvetica-Bold' }}>{d.agentEmail}</Text>
              </View>
            )}
            {d.isAdviser && d.tenantSlug && (
              <View style={{ flexDirection: 'row' }}>
                <Text style={{ width: 70, fontSize: 8, color: RS.gray400, letterSpacing: 0.5 }}>WEB</Text>
                <Text style={{ flex: 1, fontSize: 10, color: RS.navy, fontFamily: 'Helvetica-Bold' }}>realsight.app/a/{d.tenantSlug}</Text>
              </View>
            )}
            {!d.isAdviser && (
              <View style={{ flexDirection: 'row' }}>
                <Text style={{ width: 70, fontSize: 8, color: RS.gray400, letterSpacing: 0.5 }}>WEB</Text>
                <Text style={{ flex: 1, fontSize: 10, color: RS.navy, fontFamily: 'Helvetica-Bold' }}>realsight.app</Text>
              </View>
            )}
          </View>

          {/* ③ RERA verification strip — adviser only */}
          {d.isAdviser && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, marginBottom: 14, backgroundColor: RS.navy, borderRadius: 6 }}>
              {d.reraQrUrl ? (
                <Image src={d.reraQrUrl} style={{ width: 60, height: 60, backgroundColor: RS.white, padding: 3, borderRadius: 4 }} />
              ) : (
                <View style={{ width: 60, height: 60, backgroundColor: RS.navyLight, borderRadius: 4, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 6.5, color: RS.gray400, textAlign: 'center' }}>RERA QR{'\n'}pending</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ color: RS.gold, fontSize: 8, fontFamily: 'Helvetica-Bold', letterSpacing: 1, marginBottom: 4 }}>RERA VERIFIED BROKER</Text>
                {d.reraNumber && (
                  <Text style={{ color: RS.white, fontSize: 12, fontFamily: 'Helvetica-Bold', marginBottom: 2 }}>BRN {d.reraNumber}</Text>
                )}
                <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 8, lineHeight: 1.4 }}>
                  Scan the QR to verify this broker directly with the Dubai Real Estate Regulatory Agency.
                </Text>
              </View>
            </View>
          )}

          {/* ④ "Let's continue" CTA */}
          <View style={{ borderLeftWidth: 3, borderLeftColor: RS.gold, paddingLeft: 14, paddingVertical: 4, marginBottom: 14 }}>
            <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: RS.navy, marginBottom: 3 }}>Let's continue the conversation.</Text>
            <Text style={{ fontSize: 8.5, color: RS.gray600, lineHeight: 1.5 }}>
              {d.isAdviser
                ? `Have questions about this property, want to negotiate, or ready to view it in person? Reply to the email this came in or use any of the contact methods above — happy to take this further whenever suits.`
                : `Want to track this property in your portfolio, set price alerts, or run a deeper analysis? Open RealSight at realsight.app — your free account includes the Deal Analyzer, Dubai Heatmap, and unlimited AI Concierge.`}
            </Text>
          </View>

          {/* ⑤ Disclaimer */}
          <Text style={{ fontSize: 6.5, color: RS.gray400, lineHeight: 1.5, fontStyle: 'italic' }}>
            This presentation has been prepared by {d.isAdviser ? (d.agencyName || 'RealSight') : 'RealSight'} for informational purposes only.
            Data sourced from the Dubai Land Department (DLD) and RealSight Analytics. It does not constitute financial,
            legal, or investment advice; AI-generated analysis reflects market patterns and should not replace
            independent due diligence. Prospective purchasers should seek independent financial and legal advice
            before making any investment decision. Market conditions may change; past performance is not indicative
            of future results. All prices in AED unless stated. RealSight is not a licensed financial advisory service.
          </Text>
        </View>
        <SlideFooter page={pageAboutLabel} date={d.reportDate} isAdviser={d.isAdviser} slug={d.tenantSlug} />
      </Page>

    </Document>
  );
}

export async function generateInvestorPresentationPDF(data: DealAnalyzerPDFData): Promise<Blob> {
  // Same pre-fetch trick as generateDealAnalyzerPDF — @react-pdf's
  // worker fetcher silently fails for many image URLs. Pre-loading on
  // the main thread guarantees every image embeds: the two Dubai
  // banners (cover + closing slide), the headshot, the RERA QR, and
  // up to 6 listing gallery photos.
  const ORIGIN = typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin
    : 'https://www.realsight.app';
  const SKYLINE_URL = `${ORIGIN}/pdf-bg/dubai-skyline.jpg`;
  const MARINA_URL  = `${ORIGIN}/pdf-bg/dubai-marina.jpg`;

  // Gallery photos go through our proxy-image edge function — Bayut /
  // Property Finder / Dubizzle CDNs reject cross-origin fetches from
  // realsight.app, leaving Image components rendering grey
  // placeholders. Proxy fetches server-side (no CORS), returns bytes
  // with permissive headers, browser is happy.
  const galleryProxyResults = await Promise.all(
    (data.photos ?? []).map(p => fetchProxiedImageAsDataUrl(p)),
  );
  const galleryDataUrls = galleryProxyResults.filter((s): s is string => typeof s === 'string');

  const [
    skylineDataUrl,
    marinaDataUrl,
    agentPhotoDataUrl,
    reraQrDataUrl,
  ] = await Promise.all([
    imageToDataUrl(SKYLINE_URL),
    imageToDataUrl(MARINA_URL),
    data.agentPhotoUrl ? imageToDataUrl(data.agentPhotoUrl) : Promise.resolve(null),
    data.reraQrUrl     ? imageToDataUrl(data.reraQrUrl)     : Promise.resolve(null),
  ]);

  const enriched: DealAnalyzerPDFData = {
    ...data,
    _dubaiSkyline: skylineDataUrl ?? undefined,
    _dubaiMarina:  marinaDataUrl  ?? undefined,
    agentPhotoUrl: agentPhotoDataUrl ?? data.agentPhotoUrl,
    reraQrUrl:     reraQrDataUrl     ?? data.reraQrUrl,
    photos:        galleryDataUrls.length > 0 ? galleryDataUrls : data.photos,
  };

  // Diagnostic — surfaces in browser console for QA. Same shape as
  // generateDealAnalyzerPDF so the founder can read either log the
  // same way.
  console.info('[generateInvestorPresentationPDF] images prepared', {
    skyline:    !!skylineDataUrl,
    marina:     !!marinaDataUrl,
    agentPhoto: !!agentPhotoDataUrl,
    reraQr:     !!reraQrDataUrl,
    gallery:    galleryDataUrls.length,
    galleryRequested: data.photos?.length ?? 0,
  });

  const blob = await pdf(<InvestorPresentationPDFDoc d={enriched} />).toBlob();
  return blob;
}
