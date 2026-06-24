import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { ReactElement } from "react";

const BLUE = "#1d4ed8";

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 11, fontFamily: "Helvetica", color: "#111827" },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  gymTag: { fontSize: 11, color: BLUE, fontWeight: 700 },
  title: { fontSize: 22, fontWeight: 700, color: "#000", letterSpacing: 1 },

  table: { width: "100%" },
  row: {
    flexDirection: "row",
    paddingVertical: 9,
    borderBottom: `1px solid ${BLUE}`,
  },
  label: { width: "35%", color: BLUE, fontSize: 11, fontWeight: 700 },
  value: { flex: 1, color: "#111827", fontSize: 11 },

  signWrap: {
    marginTop: 64,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  signBlock: { width: 240, alignItems: "flex-start" },
  signLine: { width: 240, borderTop: "1px solid #111827", marginBottom: 6 },
  signOwner: { fontSize: 11, fontWeight: 700, color: BLUE },
  signCaption: { fontSize: 10, color: "#111827" },

  footer: {
    position: "absolute",
    bottom: 32,
    left: 48,
    right: 48,
    fontSize: 9,
    color: BLUE,
  },
});

export type InvoiceData = {
  gym: { name: string; address?: string | null; gst?: string | null };
  client: {
    name: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    age?: number | null;
    joinedAt?: string | null;
    gender?: string | null;
    exerciseType?: string | null;
  };
  trainer?: { name?: string | null; specialization?: string | null } | null;
  plan?: { name?: string | null; kind?: string | null; endDate?: string | null } | null;
  number: string;
  issuedAt: string;
  paidAt?: string | null;
  status?: string;
  fiscalYear: string;
  lines: { label: string; qty: number; unitCents: number; subCents: number }[];
  amountCents: number;
  gstCents: number;
  totalCents: number;
  currency: string;
};

const fmtAmount = (cents: number, currency = "INR") => {
  const value = (cents / 100).toFixed(2);
  return `${currency} ${value}`;
};

const fmtDateISO = (s?: string | null) => {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "—";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

export function InvoicePdf({ data }: { data: InvoiceData }): ReactElement {
  const gender = data.client.gender
    ? data.client.gender.charAt(0).toUpperCase() + data.client.gender.slice(1)
    : "—";

  const planKind = data.plan?.kind ? data.plan.kind.toUpperCase() : "—";
  const exerciseType = data.client.exerciseType ?? "general";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* ── Header: gym tag (left) + INVOICE title (right) ─────── */}
        <View style={styles.headerRow}>
          <Text style={styles.gymTag}>{data.gym.name}</Text>
          <Text style={styles.title}>INVOICE</Text>
          {/* Right spacer to keep title centered visually */}
          <View style={{ width: 80 }} />
        </View>

        {/* ── Key/value table ────────────────────────────────────── */}
        <View style={styles.table}>
          <Row label="Gym Name" value={data.gym.name || "—"} />
          <Row label="Gym Address" value={data.gym.address || "-"} />
          <Row label="Invoice Number" value={data.number} />
          <Row label="Date of Payment" value={fmtDateISO(data.paidAt ?? data.issuedAt)} />
          <Row label="Client Name" value={data.client.name || "—"} />
          <Row label="Gender" value={gender} />
          <Row label="Plan Type" value={planKind} />
          <Row label="Exercise Type" value={exerciseType} />
          <Row label="Trainer Name" value={data.trainer?.name || "Not assigned"} />
          <Row label="Date of Joining" value={fmtDateISO(data.client.joinedAt)} />
          <Row label="Amount Paid" value={fmtAmount(data.totalCents, data.currency)} />
        </View>

        {/* ── Signature ──────────────────────────────────────────── */}
        <View style={styles.signWrap}>
          <View style={styles.signBlock}>
            <View style={styles.signLine} />
            <Text style={styles.signOwner}>Owner</Text>
            <Text style={styles.signCaption}>Signature of the Owner</Text>
          </View>
        </View>

        {/* ── Footer ─────────────────────────────────────────────── */}
        <Text style={styles.footer}>System-generated. Keep this for your records.</Text>
      </Page>
    </Document>
  );
}
