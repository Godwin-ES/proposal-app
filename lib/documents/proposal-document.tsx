import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import type { ProposalSnapshot } from "@/lib/domain/types";
import {
  buildProposedSolutionIntro,
  buildDeliverablesIntro,
  buildTimelineIntro,
  buildTimelineOutro,
  buildPricingIntro,
  buildPricingOutro,
  buildNextSteps,
} from "@/lib/templates/proposal";

const INK = "#111111";
const MUTED = "#5f5f5f";
const RULE = "#dcdcdc";
const ACCENT = "#111111";

// One shared line-height for every piece of running text (paragraphs, list
// items, framing sentences, highlight-card copy) so the vertical rhythm
// never varies by section — this was the specific defect being fixed here.
const LINE_HEIGHT = 1.5;
const BODY_SIZE = 10.5;

const styles = StyleSheet.create({
  page: { paddingTop: 0, paddingBottom: 64, paddingHorizontal: 48, fontSize: BODY_SIZE, fontFamily: "Helvetica", color: INK },
  accentBar: { height: 6, backgroundColor: ACCENT, marginBottom: 32, marginHorizontal: -48 },
  title: { fontSize: 22, fontWeight: 700, marginBottom: 10, color: INK },
  metaRow: { flexDirection: "row", flexWrap: "wrap", columnGap: 14, marginBottom: 14 },
  metaItem: { fontSize: 9.5, color: MUTED },
  metaLabel: { color: MUTED },
  headerRule: { borderBottomWidth: 1, borderBottomColor: RULE, marginBottom: 22 },

  section: { marginBottom: 22 },
  sectionHeading: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  sectionNumber: { fontSize: 10, fontWeight: 700, color: MUTED, width: 22 },
  sectionTitle: { fontSize: 13, fontWeight: 700, color: INK },
  subheading: { fontSize: BODY_SIZE, fontWeight: 700, color: INK, marginTop: 10, marginBottom: 6 },

  body: { fontSize: BODY_SIZE, lineHeight: LINE_HEIGHT, color: INK },
  frame: { fontSize: BODY_SIZE, lineHeight: LINE_HEIGHT, color: MUTED, marginBottom: 8 },

  deliverableRow: { flexDirection: "row", marginBottom: 8 },
  bullet: { width: 14, fontSize: BODY_SIZE, lineHeight: LINE_HEIGHT, color: MUTED },
  deliverableText: { flex: 1, fontSize: BODY_SIZE, lineHeight: LINE_HEIGHT, color: INK },

  highlightBox: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: RULE,
    borderRadius: 4,
    marginTop: 4,
  },
  highlightCell: { flex: 1, padding: 14 },
  highlightDivider: { width: 1, backgroundColor: RULE },
  highlightFrame: { fontSize: BODY_SIZE, lineHeight: LINE_HEIGHT, color: MUTED, marginBottom: 8 },
  highlightValue: { fontSize: 13, fontWeight: 700, color: INK, marginBottom: 8 },

  signatureBlock: { marginTop: 8 },
  signatureLine: { fontSize: BODY_SIZE, lineHeight: LINE_HEIGHT, color: INK, marginBottom: 2 },

  footer: {
    position: "absolute",
    bottom: 28,
    left: 48,
    right: 48,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: RULE,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8.5,
    color: MUTED,
  },
});

function SectionHeading({ number, title }: { number: string; title: string }) {
  return (
    <View style={styles.sectionHeading} minPresenceAhead={48}>
      <Text style={styles.sectionNumber}>{number}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

export function ProposalDocument({ snapshot }: { snapshot: ProposalSnapshot }) {
  const { client, content } = snapshot;

  return (
    <Document title={`Proposal for ${client.clientName}`} author="Koya Talent">
      <Page size="A4" style={styles.page}>
        <View style={styles.accentBar} fixed />

        <Text style={styles.title}>Proposal for {client.clientName}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaItem}>{client.companyName}</Text>
          <Text style={styles.metaItem}>
            <Text style={styles.metaLabel}>Prepared by </Text>
            {client.salespersonName}
          </Text>
          <Text style={styles.metaItem}>
            <Text style={styles.metaLabel}>Date </Text>
            {client.dateOfCall}
          </Text>
        </View>
        <View style={styles.headerRule} />

        <View style={styles.section}>
          <SectionHeading number="1." title="Introduction" />
          <Text style={styles.body}>{content.introduction}</Text>
        </View>

        <View style={styles.section}>
          <SectionHeading number="2." title="Proposed Solution" />
          <Text style={styles.body}>{buildProposedSolutionIntro(client.clientName)}</Text>
          <Text style={styles.subheading}>Project Scope</Text>
          <Text style={styles.body}>{content.projectScope}</Text>
          <Text style={styles.subheading}>Recommended Approach</Text>
          <Text style={styles.body}>{content.recommendedApproach}</Text>
        </View>

        <View style={styles.section} wrap={false}>
          <SectionHeading number="3." title="Deliverables" />
          <Text style={styles.frame}>{buildDeliverablesIntro()}</Text>
          {content.deliverables.map((item, i) => (
            <View key={i} style={styles.deliverableRow} wrap={false}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.deliverableText}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section} wrap={false}>
          <View style={styles.highlightBox}>
            <View style={styles.highlightCell}>
              <SectionHeading number="4." title="Timeline" />
              <Text style={styles.highlightFrame}>{buildTimelineIntro()}</Text>
              <Text style={styles.highlightValue}>{content.timeline}</Text>
              <Text style={styles.highlightFrame}>{buildTimelineOutro()}</Text>
            </View>
            <View style={styles.highlightDivider} />
            <View style={styles.highlightCell}>
              <SectionHeading number="5." title="Pricing" />
              <Text style={styles.highlightFrame}>{buildPricingIntro()}</Text>
              <Text style={styles.highlightValue}>{content.pricing}</Text>
              <Text style={styles.highlightFrame}>{buildPricingOutro()}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section} wrap={false}>
          <SectionHeading number="6." title="Next Steps" />
          <Text style={styles.body}>{content.nextSteps || buildNextSteps()}</Text>
        </View>

        <View style={[styles.section, styles.signatureBlock]} wrap={false}>
          <Text style={styles.signatureLine}>Warm regards,</Text>
          <Text style={[styles.signatureLine, { fontWeight: 700 }]}>{client.salespersonName}</Text>
          <Text style={styles.signatureLine}>Koya Talent</Text>
        </View>

        <View style={styles.footer} fixed>
          <Text>
            Koya Talent — Prepared for {client.clientName} at {client.companyName}
          </Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
