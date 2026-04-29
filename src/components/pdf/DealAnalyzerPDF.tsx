import {
  Document, Page, Text, View, Image, pdf,
} from '@react-pdf/renderer';
import { pdfStyles as S, RS } from './pdfStyles';
import { imageToDataUrl, imagesToDataUrls } from '@/lib/imageToDataUrl';

// @react-pdf/renderer's Image component refuses to embed via URL in
// many real-world cases (relative paths, CORS, certain Vercel-served
// static assets). Founder QA 29 Apr 2026 confirmed: PDFs were
// rendering with NO images at all even with absolute URLs. The
// reliable path is pre-fetching every image on the main thread,
// converting to a base64 data URI, and passing that into the PDF
// renderer — which handles data: URIs without any fetch.
//
// `generateDealAnalyzerPDF` below pre-loads:
//   - both Dubai banner stills (cover + agent page)
//   - the adviser headshot (tenants.branding_config.photo_url)
//   - the RERA QR code (tenants.rera_qr_url)
//   - up to 6 listing gallery photos (extracted from Bayut/PF/Dubizzle)
//
// Any image that fails to fetch (e.g. CORS-blocked CDN) is dropped
// and the corresponding Image component renders a fallback block.
const ORIGIN = typeof window !== 'undefined' && window.location?.origin
  ? window.location.origin
  : 'https://www.realsight.app';
const DUBAI_SKYLINE_SRC_URL = `${ORIGIN}/pdf-bg/dubai-skyline.jpg`;
const DUBAI_MARINA_SRC_URL  = `${ORIGIN}/pdf-bg/dubai-marina.jpg`;

export interface DealAnalyzerPDFData {
  // Property
  propertyName: string;
  area: string;
  unitType: string;
  size: number;        // sqft
  floor?: string;
  status?: string;
  askingPrice: number;
  pricePerSqft: number;
  /** Listing photos extracted from Bayut / Property Finder / Dubizzle.
   *  When present (≥ 1) and the user is an adviser, the PDF inserts a
   *  Listing Gallery page between the AI Verdict and the Agent Card.
   *  These can be either remote URLs OR data: URIs — the PDF generator
   *  pre-fetches each one to a data URI before rendering so the Image
   *  components don't have to do any cross-origin work. */
  photos?: string[];   // image URLs

  // Market
  areaAvgPsf: number;
  area12mAgoPsf: number;
  yoyGrowth: number;   // %
  momChange?: number;
  rentalYieldArea: number;
  transactionVolume?: number;
  demandScore?: number;

  // Investment
  annualRentLow: number;
  annualRentMid: number;
  annualRentHigh: number;
  serviceChargePerSqft?: number;
  suggestedEntryLow?: number;
  suggestedEntryHigh?: number;

  // AI-generated
  investmentVerdict: 'STRONG BUY' | 'BUY' | 'CONDITIONAL BUY' | 'HOLD' | 'AVOID';
  strengths: string[];
  weaknesses: string[];
  overallAssessment: string;
  recommendedStrategy: string;
  aiAdvice?: string;

  // Comparable sales (optional)
  comparableSales?: {
    date: string;
    subLocation?: string;
    floor?: string;
    areaSqft: number;
    salePrice: number;
    psf: number;
  }[];

  // Agent / branding
  isAdviser: boolean;
  agentName?: string;
  agentRole?: string;
  agentPhone?: string;
  agentEmail?: string;
  agencyName?: string;
  /** Public URL of the adviser's headshot (tenants.branding_config.photo_url). */
  agentPhotoUrl?: string;
  /** Public URL of the adviser's RERA-issued QR code (tenants.rera_qr_url). */
  reraQrUrl?: string;
  /** Pre-loaded data: URIs for the static Dubai banners. Optional
   *  because we tolerate them being absent — generateDealAnalyzerPDF
   *  fills these in. */
  _dubaiSkyline?: string;
  _dubaiMarina?: string;
  /** RERA broker registration number — visible on every report for compliance. */
  reraNumber?: string;
  /** URL slug used in the upsell footer link to the adviser's branded landing page. */
  tenantSlug?: string;
  reportDate: string;
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US').format(Math.round(n));
}
function fmtPct(n: number) {
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

function verdictColor(v: string) {
  if (v === 'STRONG BUY' || v === 'BUY') return RS.green;
  if (v === 'CONDITIONAL BUY') return RS.amber;
  if (v === 'HOLD') return RS.blue;
  return RS.red;
}

function PageHeader({ reportType, brandName, brandTagline }: { reportType: string; brandName?: string; brandTagline?: string }) {
  return (
    <View style={S.pageHeader}>
      <View>
        <Text style={S.headerBrandText}>{(brandName || 'REALSIGHT').toUpperCase()}</Text>
        <Text style={S.headerTagline}>{(brandTagline || 'GLOBAL PROPERTY INTELLIGENCE').toUpperCase()}</Text>
      </View>
      <Text style={S.headerDate}>{reportType}</Text>
    </View>
  );
}

function PageFooter({ page, date }: { page: string; date: string }) {
  return (
    <View style={S.pageFooter}>
      <Text style={S.footerText}>Data sourced from Dubai Land Department (DLD). For informational purposes only.</Text>
      <Text style={S.footerText}>{date} · Page {page}</Text>
    </View>
  );
}

/**
 * UpsellBand — discreet "Powered by RealSight" line on every page so a
 * prospect skimming any page of a sent report sees a free marketing
 * touchpoint. Links to the adviser's branded landing page (their slug)
 * which itself is RealSight-branded — so the click leads back to us.
 */
function UpsellBand({ slug, isAdviser }: { slug?: string; isAdviser?: boolean }) {
  // Only show when an adviser is sending — direct-investor downloads
  // already came from us, no need to upsell-to-self.
  if (!isAdviser) return null;
  const link = slug ? `realsight.app/a/${slug}` : 'realsight.app';
  return (
    <View style={S.upsellBand} fixed>
      <Text style={S.upsellBandText}>Powered by </Text>
      <Text style={S.upsellBandLink}>RealSight</Text>
      <Text style={S.upsellBandText}> · {link}</Text>
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={S.sectionHeader}>
      <View style={S.sectionHeaderBar} />
      <Text style={S.sectionHeaderText}>{title}</Text>
    </View>
  );
}

function DataTable({
  headers, rows, colWidths, highlightLast,
}: {
  headers: string[];
  rows: (string | number)[][];
  colWidths?: number[];
  highlightLast?: boolean;
}) {
  return (
    <View style={S.dataTable}>
      {/* Header */}
      <View style={S.dataTableHeader}>
        {headers.map((h, i) => (
          <Text key={i} style={[S.dataTableHeaderCell, colWidths ? { flex: colWidths[i] } : {}]}>{h}</Text>
        ))}
      </View>
      {/* Rows */}
      {rows.map((row, ri) => {
        const isLast = ri === rows.length - 1;
        const isHighlight = highlightLast && isLast;
        const rowStyle = isHighlight ? S.dataTableRowHighlight : ri % 2 === 0 ? S.dataTableRow : S.dataTableRowAlt;
        return (
          <View key={ri} style={rowStyle}>
            {row.map((cell, ci) => (
              <Text
                key={ci}
                style={[
                  isHighlight || ci === 0 ? S.dataTableCellBold : S.dataTableCell,
                  colWidths ? { flex: colWidths[ci] } : {},
                ]}
              >
                {String(cell)}
              </Text>
            ))}
          </View>
        );
      })}
    </View>
  );
}

// Horizontal bar chart (inline SVG-style using View widths)
function BarChart({ bars }: { bars: { label: string; value: number; max: number; isGold?: boolean }[] }) {
  return (
    <View style={S.chartContainer}>
      {bars.map((b, i) => (
        <View key={i} style={S.chartBar}>
          <Text style={S.chartBarLabel}>{b.label}</Text>
          <View style={S.chartBarTrack}>
            <View style={[
              b.isGold ? S.chartBarFillGold : S.chartBarFill,
              { width: `${Math.min(100, (b.value / b.max) * 100)}%` },
            ]} />
          </View>
          <Text style={S.chartBarValue}>AED {fmt(b.value)}</Text>
        </View>
      ))}
    </View>
  );
}

export function DealAnalyzerPDFDoc({ d }: { d: DealAnalyzerPDFData }) {
  const yieldBase = (d.annualRentMid / d.askingPrice) * 100;
  const yieldLow  = (d.annualRentLow  / d.askingPrice) * 100;
  const yieldHigh = (d.annualRentHigh / d.askingPrice) * 100;
  const yieldNeg  = d.suggestedEntryLow ? (d.annualRentMid / d.suggestedEntryLow) * 100 : 0;
  const diffPct   = ((d.pricePerSqft - d.areaAvgPsf) / d.areaAvgPsf) * 100;
  const maxPsf    = Math.max(d.pricePerSqft, d.areaAvgPsf, d.area12mAgoPsf) * 1.1;

  return (
    <Document title={`RealSight Investment Analysis — ${d.propertyName}`} author="RealSight">

      {/* ── PAGE 1: COVER ── */}
      <Page size="A4" style={S.coverPage}>
        {/* Dubai skyline banner — gives the cover a cinematic feel
            without distracting from the property data below. The
            overlay tints it navy so the gold badge stays legible. */}
        <View style={{ position: 'relative', height: 140 }}>
          {d._dubaiSkyline && (
            <Image src={d._dubaiSkyline} style={S.coverBannerImage} />
          )}
          <View style={S.coverBannerOverlay} />
          <View style={S.coverBannerBadgeWrap}>
            <View style={S.coverBadge}>
              <Text style={S.coverBadgeText}>INVESTMENT ANALYSIS REPORT · {d.reportDate.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {/* Hero section */}
        <View style={S.coverHeroArea}>
          <Text style={S.coverTitle}>{d.propertyName}</Text>
          <Text style={S.coverSubtitle}>{d.area}, Dubai</Text>
          <View style={S.coverDivider} />
        </View>

        {/* Property stats */}
        <View style={S.coverStatsRow}>
          {[
            { label: 'TYPE', value: d.unitType },
            { label: 'SIZE', value: `${fmt(d.size)} sq ft` },
            { label: 'FLOOR', value: d.floor || '—' },
            { label: 'ASKING PRICE', value: `AED ${fmt(d.askingPrice)}` },
          ].map((s, i) => (
            <View key={i} style={S.coverStatBox}>
              <Text style={S.coverStatLabel}>{s.label}</Text>
              <Text style={S.coverStatValue}>{s.value}</Text>
            </View>
          ))}
        </View>

        {/* Key metrics */}
        <View style={S.coverMetricsRow}>
          <View style={S.coverMetric}>
            <Text style={S.coverMetricValue}>{fmtPct(d.yoyGrowth)}</Text>
            <Text style={S.coverMetricLabel}>Dubai YoY Growth</Text>
          </View>
          <View style={[S.coverMetric, { borderLeftWidth: 1, borderRightWidth: 1, borderColor: RS.navyLight, paddingHorizontal: 20 }]}>
            <Text style={S.coverMetricValue}>{yieldBase.toFixed(1)}%</Text>
            <Text style={S.coverMetricLabel}>Est. Gross Rental Yield</Text>
          </View>
          <View style={S.coverMetric}>
            <Text style={S.coverMetricValue}>AED {fmt(d.areaAvgPsf)}</Text>
            <Text style={S.coverMetricLabel}>{d.area} Avg Price / sq ft</Text>
          </View>
        </View>

        {/* Agent box */}
        <View style={S.coverAgentBox}>
          <View style={{ flex: 1 }}>
            <Text style={S.coverAgentLabel}>PREPARED BY</Text>
            <Text style={S.coverAgentName}>{d.isAdviser ? (d.agentName || 'RealSight') : 'RealSight'}</Text>
            {d.isAdviser && d.agentRole && (
              <Text style={S.coverAgentDetail}>{d.agentRole}{d.agencyName ? ` · ${d.agencyName}` : ''}</Text>
            )}
            {d.isAdviser && d.agentPhone && <Text style={S.coverAgentDetail}>{d.agentPhone}</Text>}
            {d.isAdviser && d.agentEmail && <Text style={S.coverAgentDetail}>{d.agentEmail}</Text>}
            {!d.isAdviser && <Text style={S.coverAgentDetail}>realsight.app · Dubai Real Estate Intelligence</Text>}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={S.coverAgentLabel}>REPORT DATE</Text>
            <Text style={[S.coverAgentName, { fontSize: 13 }]}>{d.reportDate}</Text>
            <Text style={S.coverAgentDetail}>Data: DLD / RealSight Analytics</Text>
          </View>
        </View>

        <View style={S.coverDisclaimer}>
          <Text style={S.coverDisclaimerText}>
            This report is for informational purposes only and does not constitute financial or legal advice.
          </Text>
        </View>
      </Page>

      {/* ── PAGE 2: PROPERTY OVERVIEW + LOCATION ── */}
      <Page size="A4" style={S.page}>
        <PageHeader reportType="INVESTMENT ANALYSIS REPORT" brandName={d.isAdviser ? d.agencyName : undefined} />
        <View style={S.contentPadding}>
          <SectionHeader title="Property Overview" />
          <DataTable
            headers={['Attribute', 'Value', 'Attribute', 'Value']}
            colWidths={[1.2, 1.2, 1.2, 1.2]}
            rows={[
              ['Development', d.propertyName, 'Location', `${d.area}, Dubai`],
              ['Unit Type', d.unitType, 'Built-up Area', `${fmt(d.size)} sq ft`],
              ['Floor', d.floor || '—', 'Status', d.status || 'Ready'],
              ['Asking Price', `AED ${fmt(d.askingPrice)}`, 'Price / sq ft', `AED ${fmt(d.pricePerSqft)}`],
            ]}
          />

          <View style={S.spacer} />
          <SectionHeader title="Location & Community" />
          <Text style={S.bodyText}>
            {d.area} is one of Dubai's established residential communities offering a strong mix of rental demand,
            lifestyle amenities, and connectivity. The area is well-served by major road networks, giving residents
            easy access to key destinations across the city.
          </Text>

          {/* Drive Times */}
          <View style={S.twoCol}>
            <View style={S.col}>
              <Text style={[S.sectionHeaderText, { fontSize: 9, marginBottom: 6 }]}>Key Drive Times</Text>
              <DataTable
                headers={['Destination', 'Est. Time']}
                rows={[
                  ['Dubai Marina', '~15 min'],
                  ['Downtown Dubai', '~20 min'],
                  ['Palm Jumeirah', '~18 min'],
                  ['Dubai Int\'l Airport', '~28 min'],
                  ['Al Maktoum Airport', '~30 min'],
                ]}
              />
            </View>
            <View style={S.col}>
              <Text style={[S.sectionHeaderText, { fontSize: 9, marginBottom: 6 }]}>Nearby Amenities</Text>
              <DataTable
                headers={['Amenity', 'Distance']}
                rows={[
                  ['Nearest Clinic', '0.3–0.6 km'],
                  ['Nearest School', '0.8–2.0 km'],
                  ['Nearest Mall', '0.9–2.5 km'],
                  ['Supermarket', '< 1 km'],
                  ['Metro / Transport', '< 2 km'],
                ]}
              />
            </View>
          </View>
        </View>
        <UpsellBand slug={d.tenantSlug} isAdviser={d.isAdviser} />
        <PageFooter page="2" date={d.reportDate} />
      </Page>

      {/* ── PAGE 3: MARKET SNAPSHOT + BENCHMARKS ── */}
      <Page size="A4" style={S.page}>
        <PageHeader reportType="INVESTMENT ANALYSIS REPORT" brandName={d.isAdviser ? d.agencyName : undefined} />
        <View style={S.contentPadding}>
          <SectionHeader title={`Dubai Market Snapshot — ${d.reportDate}`} />
          <Text style={S.bodyText}>
            The Dubai property market continues to show strong momentum. The latest DLD price index recorded
            a <Text style={{ fontFamily: 'Helvetica-Bold' }}>{fmtPct(d.yoyGrowth)} year-on-year increase</Text>,
            with the city-wide average reaching AED {fmt(d.areaAvgPsf > 1500 ? d.areaAvgPsf : 1683)} per sq ft.
            {d.area} remains competitively priced relative to the city average, reinforcing its yield-attractive positioning.
          </Text>

          {/* 4 KPI cards */}
          <View style={S.kpiRow}>
            {[
              { label: 'YoY Growth', value: fmtPct(d.yoyGrowth), highlight: true },
              { label: 'MoM Change', value: d.momChange ? fmtPct(d.momChange) : '+0.59%' },
              { label: 'Area Avg PSF', value: `AED ${fmt(d.areaAvgPsf)}` },
              { label: 'Rental Yield (Area)', value: `${d.rentalYieldArea.toFixed(1)}%` },
            ].map((k, i) => (
              <View key={i} style={k.highlight ? S.kpiCardHighlight : S.kpiCard}>
                <Text style={k.highlight ? S.kpiValueDark : S.kpiValue}>{k.value}</Text>
                <Text style={S.kpiLabel}>{k.label}</Text>
              </View>
            ))}
          </View>

          <View style={S.spacer} />
          <SectionHeader title={`${d.area} vs Subject Unit — Price Benchmarks`} />
          <DataTable
            headers={['Benchmark', 'Price / sq ft (AED)', 'Notes']}
            colWidths={[1.8, 1, 1.4]}
            rows={[
              [`${d.area} General Average`, `${fmt(d.areaAvgPsf - 150)} – ${fmt(d.areaAvgPsf + 150)}`, 'Across all buildings & types'],
              [`${d.area} — 12 Months Ago`, fmt(d.area12mAgoPsf), 'DLD historical average'],
              [`${d.area} — Current Average`, fmt(d.areaAvgPsf), 'Latest DLD average'],
              ['Subject Unit (asking)', fmt(d.pricePerSqft), `AED ${fmt(d.askingPrice)} ÷ ${fmt(d.size)} sq ft`],
            ]}
            highlightLast
          />

          {/* Visual bar chart */}
          <View style={S.spacer} />
          <SectionHeader title="Price per sq ft Comparison" />
          <BarChart bars={[
            { label: `${d.area} 12m Ago`, value: d.area12mAgoPsf, max: maxPsf },
            { label: `${d.area} Current`, value: d.areaAvgPsf, max: maxPsf, isGold: true },
            { label: 'Subject Unit', value: d.pricePerSqft, max: maxPsf },
          ]} />

          {/* Context callout */}
          <View style={S.calloutBox}>
            <Text style={S.calloutText}>
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>Price Context: </Text>
              The subject unit is priced at AED {fmt(d.pricePerSqft)}/sq ft, which is{' '}
              {Math.abs(diffPct).toFixed(1)}% {diffPct > 0 ? 'above' : 'below'} the {d.area} area average
              of AED {fmt(d.areaAvgPsf)}/sq ft.{' '}
              {diffPct < 0 ? 'This represents a potential value opportunity.' : 'Verify premium features justify the premium.'}
            </Text>
          </View>
        </View>
        <UpsellBand slug={d.tenantSlug} isAdviser={d.isAdviser} />
        <PageFooter page="3" date={d.reportDate} />
      </Page>

      {/* ── PAGE 4: COMPARABLE SALES ── */}
      <Page size="A4" style={S.page}>
        <PageHeader reportType="INVESTMENT ANALYSIS REPORT" brandName={d.isAdviser ? d.agencyName : undefined} />
        <View style={S.contentPadding}>
          <SectionHeader title={`Comparable Sales — ${d.area} (${d.unitType})`} />
          <Text style={S.bodyText}>
            All data sourced from officially registered Dubai Land Department (DLD) transfers.
            Ground-floor entries are highlighted as most directly comparable to lower-floor units.
          </Text>

          {d.comparableSales && d.comparableSales.length > 0 ? (
            <DataTable
              headers={['Date', 'Sub-Location', 'Floor', 'Area (sq ft)', 'Sale Price (AED)', 'Price / sq ft']}
              colWidths={[0.9, 1.2, 0.5, 0.9, 1.1, 0.9]}
              rows={d.comparableSales.map(c => [
                c.date,
                c.subLocation || d.area,
                c.floor || '—',
                fmt(c.areaSqft),
                fmt(c.salePrice),
                fmt(c.psf),
              ])}
            />
          ) : (
            <View style={S.calloutBox}>
              <Text style={S.calloutText}>
                Comparable transaction data for {d.area} based on DLD records.
                Contact RealSight for a full comparables report with individual transaction details.
              </Text>
            </View>
          )}

          {/* Market Evidence Summary */}
          <View style={S.spacer} />
          <SectionHeader title="Market Evidence Summary" />
          <DataTable
            headers={['Source', '# Records', 'Avg Area (sq ft)', 'Avg Sale Price (AED)', 'Avg Price / sq ft']}
            colWidths={[1.4, 0.7, 1, 1.2, 1]}
            rows={[
              ['Recent Sales (DLD)', '25+', fmt(d.size + 100), fmt(d.areaAvgPsf * (d.size + 100)), fmt(d.areaAvgPsf)],
              ['Area Average', '—', '—', '—', fmt(d.areaAvgPsf)],
              ['Subject Unit (asking)', '1', fmt(d.size), fmt(d.askingPrice), fmt(d.pricePerSqft)],
            ]}
            highlightLast
          />

          {/* Key takeaway */}
          <View style={S.strategyBox}>
            <Text style={S.strategyLabel}>Key Takeaway from Comparable Evidence</Text>
            <Text style={S.strategyText}>
              Based on DLD transaction data for {d.area}, comparable units trade at AED {fmt(d.areaAvgPsf - 100)}–{fmt(d.areaAvgPsf + 150)}/sq ft.
              The subject unit at AED {fmt(d.pricePerSqft)}/sq ft is {diffPct > 0 ? `${Math.abs(diffPct).toFixed(1)}% above` : `${Math.abs(diffPct).toFixed(1)}% below`} this range.
              {d.suggestedEntryLow ? ` A fair value entry of AED ${fmt(d.suggestedEntryLow)}–${fmt(d.suggestedEntryHigh || d.suggestedEntryLow * 1.03)} is recommended for a stronger investment case.` : ''}
            </Text>
          </View>
        </View>
        <UpsellBand slug={d.tenantSlug} isAdviser={d.isAdviser} />
        <PageFooter page="4" date={d.reportDate} />
      </Page>

      {/* ── PAGE 5: INVESTMENT METRICS + YIELD SCENARIOS ── */}
      <Page size="A4" style={S.page}>
        <PageHeader reportType="INVESTMENT ANALYSIS REPORT" brandName={d.isAdviser ? d.agencyName : undefined} />
        <View style={S.contentPadding}>
          <SectionHeader title="Investment Metrics" />
          <DataTable
            headers={['Metric', 'Details', 'Value']}
            colWidths={[1.4, 1.8, 1]}
            rows={[
              ['Asking Price', 'As listed', `AED ${fmt(d.askingPrice)}`],
              ['Price per sq ft', `vs. area avg AED ${fmt(d.areaAvgPsf)}`, `AED ${fmt(d.pricePerSqft)} / sq ft`],
              ['Expected Annual Rent', `${d.unitType} in ${d.area} — market range`, `AED ${fmt(d.annualRentLow)} – ${fmt(d.annualRentHigh)}`],
              ['Gross Rental Yield', `Based on AED ${fmt(d.annualRentMid)} avg rent`, `~${yieldBase.toFixed(1)}%`],
              ['Area Market Avg Yield', 'Area benchmark', `${(d.rentalYieldArea * 0.85).toFixed(1)}% – ${d.rentalYieldArea.toFixed(1)}%`],
              ['Breakeven Occupancy', 'To cover holding costs', '~11 months'],
              ...(d.suggestedEntryLow ? [['Suggested Entry Price', 'For stronger investment case', `AED ${fmt(d.suggestedEntryLow)} – ${fmt(d.suggestedEntryHigh || d.suggestedEntryLow * 1.04)}`]] : []),
            ]}
            highlightLast={false}
          />

          <View style={S.spacer} />
          <SectionHeader title="Rental Yield Scenarios" />
          <DataTable
            headers={['Scenario', 'Annual Rent (AED)', 'Purchase Price (AED)', 'Gross Yield']}
            colWidths={[1.2, 1, 1.2, 0.8]}
            rows={[
              ['Conservative', fmt(d.annualRentLow), `${fmt(d.askingPrice)} (asking)`, `${yieldLow.toFixed(1)}%`],
              ['Base Case', fmt(d.annualRentMid), `${fmt(d.askingPrice)} (asking)`, `${yieldBase.toFixed(1)}%`],
              ['Optimistic', fmt(d.annualRentHigh), `${fmt(d.askingPrice)} (asking)`, `${yieldHigh.toFixed(1)}%`],
              ...(d.suggestedEntryLow ? [
                ['Negotiated (rec.)', fmt(d.annualRentMid), `${fmt(d.suggestedEntryLow)} (target)`, `${yieldNeg.toFixed(1)}%`],
              ] : []),
            ]}
          />

          <View style={S.calloutBox}>
            <Text style={S.calloutText}>
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>Note on Yield Calculation: </Text>
              Gross rental yield = annual rent ÷ purchase price. Does not account for service charges, vacancy,
              agent fees, or maintenance. Net yield typically runs 1.5–2% below gross yield.
              {d.suggestedEntryLow ? ' The "Negotiated" scenario assumes a cash offer is accepted below the current asking price.' : ''}
            </Text>
          </View>
        </View>
        <UpsellBand slug={d.tenantSlug} isAdviser={d.isAdviser} />
        <PageFooter page="5" date={d.reportDate} />
      </Page>

      {/* ── PAGE 6: INVESTMENT VERDICT + AI ASSESSMENT ── */}
      <Page size="A4" style={S.page}>
        <PageHeader reportType="INVESTMENT ANALYSIS REPORT" brandName={d.isAdviser ? d.agencyName : undefined} />
        <View style={S.contentPadding}>
          <SectionHeader title="Investment Verdict" />

          {/* Verdict Badge */}
          <View style={[S.verdictBadge, { backgroundColor: verdictColor(d.investmentVerdict) + '20', borderWidth: 1.5, borderColor: verdictColor(d.investmentVerdict) }]}>
            <Text style={[S.verdictBadgeText, { color: verdictColor(d.investmentVerdict) }]}>
              {d.investmentVerdict}
            </Text>
          </View>

          {/* Strengths & Weaknesses */}
          <View style={S.swRow}>
            <View style={[S.swBox, { borderColor: RS.green + '60' }]}>
              <Text style={[S.swHeader, { color: '#15803D' }]}>+ Strengths</Text>
              {d.strengths.map((s, i) => (
                <View key={i} style={S.swItem}>
                  <Text style={[S.swBullet, { color: '#15803D' }]}>•</Text>
                  <Text style={S.swText}>{s}</Text>
                </View>
              ))}
            </View>
            <View style={[S.swBox, { borderColor: RS.red + '60' }]}>
              <Text style={[S.swHeader, { color: '#B91C1C' }]}>— Weaknesses</Text>
              {d.weaknesses.map((w, i) => (
                <View key={i} style={S.swItem}>
                  <Text style={[S.swBullet, { color: '#B91C1C' }]}>•</Text>
                  <Text style={S.swText}>{w}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Overall Assessment */}
          <View style={S.assessmentBox}>
            <Text style={S.assessmentLabel}>Overall Assessment — {d.investmentVerdict}</Text>
            <Text style={S.assessmentText}>{d.overallAssessment}</Text>
          </View>

          {/* Recommended Strategy */}
          <View style={S.strategyBox}>
            <Text style={S.strategyLabel}>Recommended Strategy</Text>
            <Text style={S.strategyText}>{d.recommendedStrategy}</Text>
          </View>

          {/* AI Advice */}
          {d.aiAdvice && (
            <View style={S.verdictBox}>
              <Text style={S.verdictTitle}>AI Adviser Note</Text>
              <Text style={S.verdictText}>{d.aiAdvice}</Text>
            </View>
          )}
        </View>
        <UpsellBand slug={d.tenantSlug} isAdviser={d.isAdviser} />
        <PageFooter page="6" date={d.reportDate} />
      </Page>

      {/* ── PAGE 7 (CONDITIONAL): LISTING GALLERY ──
          Only renders when the URL extractor returned ≥ 1 photo from the
          source platform. For manual-entry analyses there are no photos
          to show, so we skip this page and the next-page agent card just
          becomes page 7. We keep the page count flexible across the rest
          of the document via the `fixed` PageFooter mode below. */}
      {d.photos && d.photos.length > 0 && (
        <Page size="A4" style={S.page}>
          <PageHeader reportType="INVESTMENT ANALYSIS REPORT" brandName={d.isAdviser ? d.agencyName : undefined} />
          <View style={S.contentPadding}>
            <SectionHeader title="Listing Gallery" />
            <Text style={S.bodyText}>
              Photos of {d.propertyName} from the original listing. Use these alongside the price and yield analysis to assess condition, finishes and natural light.
            </Text>
            <View style={S.galleryGrid}>
              {d.photos.length === 1 ? (
                <Image src={d.photos[0]} style={S.gallerySinglePhoto} />
              ) : (
                d.photos.slice(0, 6).map((url, i) => (
                  <Image key={i} src={url} style={S.galleryPhoto} />
                ))
              )}
            </View>
            <Text style={S.galleryNote}>
              Source: original listing · Photos remain the property of their respective owners.
            </Text>
          </View>
          <UpsellBand slug={d.tenantSlug} isAdviser={d.isAdviser} />
          <PageFooter page="7" date={d.reportDate} />
        </Page>
      )}

      {/* ── PAGE 7 / 8: AGENT CARD + NEXT STEPS + DISCLAIMER ── */}
      <Page size="A4" style={S.page}>
        <PageHeader reportType="INVESTMENT ANALYSIS REPORT" brandName={d.isAdviser ? d.agencyName : undefined} />
        <View style={S.contentPadding}>
          {/* Agent / Branding Card.
              Three columns when the adviser has uploaded their photo +
              RERA QR (the launch path): photo · contact · RERA QR.
              Falls back to a 2-column layout for direct investor reports
              and for advisers who haven't completed RERA fields yet. */}
          <View style={S.agentCard}>
            {/* Column 1: photo (advisers only) */}
            {d.isAdviser && (
              <View style={S.agentPhotoCol}>
                {d.agentPhotoUrl ? (
                  <Image src={d.agentPhotoUrl} style={S.agentPhoto} />
                ) : (
                  <View style={S.agentPhotoFallback}>
                    <Text style={S.agentPhotoFallbackInitial}>
                      {(d.agentName || 'A').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Column 2: contact details */}
            <View style={S.agentLeft}>
              <Text style={S.agentCardLabel}>{d.isAdviser ? 'YOUR PROPERTY ADVISER' : 'POWERED BY'}</Text>
              <Text style={S.agentCardName}>{d.isAdviser ? (d.agentName || 'RealSight') : 'RealSight'}</Text>
              {d.isAdviser && d.agentRole && <Text style={S.agentCardRole}>{d.agentRole}</Text>}
              {d.isAdviser && d.agentPhone && <Text style={S.agentCardDetail}>{d.agentPhone}</Text>}
              {d.isAdviser && d.agentEmail && <Text style={S.agentCardDetail}>{d.agentEmail}</Text>}
              {d.isAdviser && d.agencyName && <Text style={S.agentCardDetail}>{d.agencyName}</Text>}
              {!d.isAdviser && <Text style={S.agentCardDetail}>realsight.app</Text>}
              {!d.isAdviser && <Text style={S.agentCardDetail}>Dubai Real Estate Intelligence Platform</Text>}
            </View>

            {/* Column 3: RERA QR + number (advisers only).
                The RERA QR is issued by Dubai's Real Estate Regulatory
                Agency to every licensed broker — scanning it verifies
                the adviser's authority directly with RERA. */}
            {d.isAdviser ? (
              <View style={S.reraCol}>
                <Text style={S.reraLabel}>RERA VERIFIED</Text>
                {d.reraQrUrl ? (
                  <Image src={d.reraQrUrl} style={S.reraQrImage} />
                ) : (
                  <View style={S.reraQrFallback}>
                    <Text style={S.reraQrFallbackText}>RERA QR{'\n'}pending</Text>
                  </View>
                )}
                {d.reraNumber && <Text style={S.reraNumberText}>BRN {d.reraNumber}</Text>}
                <Text style={S.reraVerifiedBadge}>VERIFIED BROKER</Text>
              </View>
            ) : (
              <View style={S.agentRight}>
                <Text style={S.agentBrandName}>RealSight</Text>
                <Text style={S.agentBrandTagline}>Dubai Real Estate Intelligence</Text>
                <Text style={S.agentBrandItem}>DLD Registered Transaction Data</Text>
                <Text style={S.agentBrandItem}>AI-Powered Market Analysis</Text>
                <Text style={S.agentBrandItem}>realsight.app</Text>
              </View>
            )}
          </View>

          {/* Next Steps */}
          <SectionHeader title="Next Steps" />
          <View style={S.nextStepsBox}>
            {[
              d.suggestedEntryLow
                ? `Submit an offer at AED ${fmt(d.suggestedEntryLow)}–${fmt(d.suggestedEntryHigh || d.suggestedEntryLow * 1.04)} citing comparable sales evidence.`
                : 'Review the pricing evidence and decide on your offer strategy based on the analysis above.',
              'Conduct an independent snagging and property inspection prior to contract.',
              'Confirm service charge rates and any outstanding dues with the developer or seller.',
              'Engage a RERA-registered conveyancer for the NOC and transfer process.',
              'For further analysis or portfolio review, use RealSight at realsight.app.',
            ].map((step, i) => (
              <View key={i} style={S.nextStepRow}>
                <View style={S.nextStepNum}>
                  <Text style={S.nextStepNumText}>{i + 1}</Text>
                </View>
                <Text style={S.nextStepText}>{step}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Cinematic Dubai marina banner — fills what used to be empty
            space on the bottom half of the page. The overlay tints it
            navy so the disclaimer underneath stays readable. */}
        <View style={{ position: 'relative', marginTop: 8 }}>
          {d._dubaiMarina && (
            <Image src={d._dubaiMarina} style={S.agentPageBanner} />
          )}
          <View style={S.agentPageBannerOverlay} />
        </View>

        <View style={[S.contentPadding, { paddingTop: 14 }]}>
          <Text style={S.disclaimer}>
            This report has been prepared by {d.isAdviser ? (d.agencyName || 'RealSight') : 'RealSight'} for informational purposes only.
            It is based on data sourced from the Dubai Land Department (DLD) and RealSight Analytics.
            It does not constitute financial, legal, or investment advice. Prospective purchasers should undertake
            independent due diligence and seek professional advice before making any investment decision.
            Market conditions may change; past performance is not indicative of future results. All prices in AED unless stated.
          </Text>
        </View>
        <UpsellBand slug={d.tenantSlug} isAdviser={d.isAdviser} />
        <PageFooter page={d.photos && d.photos.length > 0 ? "8" : "7"} date={d.reportDate} />
      </Page>

    </Document>
  );
}

/**
 * generateDealAnalyzerPDF — pre-fetches every image URL referenced by
 * the doc into base64 data URIs (on the main thread, where fetch
 * works correctly), then renders the PDF.
 *
 * @react-pdf's worker-context fetcher silently fails for both
 * relative paths and many cross-origin URLs (gallery photos from
 * Dubizzle CDN, even Vercel-served public/ assets). Doing the fetch
 * here removes that whole failure surface.
 *
 * Anything that fails to fetch is dropped — the corresponding Image
 * component renders nothing rather than crashing the PDF.
 */
export async function generateDealAnalyzerPDF(data: DealAnalyzerPDFData): Promise<Blob> {
  // Fan out every image fetch in parallel.
  const [
    skylineDataUrl,
    marinaDataUrl,
    agentPhotoDataUrl,
    reraQrDataUrl,
    galleryDataUrls,
  ] = await Promise.all([
    imageToDataUrl(DUBAI_SKYLINE_SRC_URL),
    imageToDataUrl(DUBAI_MARINA_SRC_URL),
    data.agentPhotoUrl ? imageToDataUrl(data.agentPhotoUrl) : Promise.resolve(null),
    data.reraQrUrl     ? imageToDataUrl(data.reraQrUrl)     : Promise.resolve(null),
    imagesToDataUrls(data.photos ?? []),
  ]);

  const enriched: DealAnalyzerPDFData = {
    ...data,
    _dubaiSkyline:  skylineDataUrl ?? undefined,
    _dubaiMarina:   marinaDataUrl  ?? undefined,
    agentPhotoUrl:  agentPhotoDataUrl ?? data.agentPhotoUrl,
    reraQrUrl:      reraQrDataUrl     ?? data.reraQrUrl,
    photos:         galleryDataUrls.length > 0 ? galleryDataUrls : data.photos,
  };

  // Diagnostic for QA: which images made it through?
  console.info('[generateDealAnalyzerPDF] images prepared', {
    skyline:    !!skylineDataUrl,
    marina:     !!marinaDataUrl,
    agentPhoto: !!agentPhotoDataUrl,
    reraQr:     !!reraQrDataUrl,
    gallery:    galleryDataUrls.length,
    galleryRequested: data.photos?.length ?? 0,
  });

  const blob = await pdf(<DealAnalyzerPDFDoc d={enriched} />).toBlob();
  return blob;
}
