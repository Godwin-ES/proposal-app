import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import type { ProposalSnapshot } from "@/lib/domain/types";
import { buildNextSteps } from "@/lib/templates/proposal";

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 11, fontFamily: "Helvetica", color: "#1a1a1a" },
  title: { fontSize: 20, fontWeight: 700, marginBottom: 4 },
  meta: { fontSize: 10, color: "#555555", marginBottom: 2 },
  section: { marginTop: 18 },
  sectionTitle: { fontSize: 13, fontWeight: 700, marginBottom: 6, color: "#111111" },
  body: { lineHeight: 1.5 },
  deliverableRow: { flexDirection: "row", marginBottom: 3 },
  bullet: { width: 12 },
  footer: { position: "absolute", bottom: 32, left: 48, right: 48, fontSize: 9, color: "#888888", textAlign: "center" },
  pageNumber: { position: "absolute", bottom: 32, right: 48, fontSize: 9, color: "#888888" },
});

export function ProposalDocument({ snapshot }: { snapshot: ProposalSnapshot }) {
  const { client, content } = snapshot;

  return (
    <Document title={`Proposal for ${client.clientName}`} author="Koya Talent">
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Proposal for {client.clientName}</Text>
        <Text style={styles.meta}>{client.companyName}</Text>
        <Text style={styles.meta}>Prepared by {client.salespersonName}</Text>
        <Text style={styles.meta}>Date: {client.dateOfCall}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Introduction</Text>
          <Text style={styles.body}>{content.introduction}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Proposed Solution</Text>
          <Text style={[styles.body, { fontWeight: 700, marginBottom: 2 }]}>Project Scope</Text>
          <Text style={styles.body}>{content.projectScope}</Text>
          <Text style={[styles.body, { fontWeight: 700, marginTop: 8, marginBottom: 2 }]}>Recommended Approach</Text>
          <Text style={styles.body}>{content.recommendedApproach}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Deliverables</Text>
          {content.deliverables.map((item, i) => (
            <View key={i} style={styles.deliverableRow}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.body}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Timeline</Text>
          <Text style={styles.body}>{content.timeline}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Pricing</Text>
          <Text style={styles.body}>{content.pricing}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Next Steps</Text>
          <Text style={styles.body}>{content.nextSteps || buildNextSteps()}</Text>
        </View>

        <View style={[styles.section, { marginTop: 24 }]}>
          <Text style={styles.body}>Warm regards,</Text>
          <Text style={styles.body}>{client.salespersonName}</Text>
          <Text style={styles.body}>Koya Talent</Text>
        </View>

        <Text style={styles.footer} fixed>
          Koya Talent — Prepared for {client.clientName} at {client.companyName}
        </Text>
        <Text
          style={styles.pageNumber}
          fixed
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
        />
      </Page>
    </Document>
  );
}
