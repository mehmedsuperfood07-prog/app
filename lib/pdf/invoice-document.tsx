import "server-only";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  businessName: { fontSize: 16, fontWeight: 700 },
  invoiceMeta: { textAlign: "right" },
  section: { marginBottom: 16 },
  label: { color: "#71717a", fontSize: 9 },
  table: { marginTop: 8 },
  tableHeaderRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    paddingBottom: 4,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#d4d4d8",
    paddingVertical: 4,
  },
  colProduct: { width: "46%" },
  colQty: { width: "12%", textAlign: "right" },
  colUnitPrice: { width: "21%", textAlign: "right" },
  colLineTotal: { width: "21%", textAlign: "right" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#000",
  },
  totalLabel: { fontSize: 11, fontWeight: 700, marginRight: 12 },
  totalValue: { fontSize: 11, fontWeight: 700 },
});

export type InvoiceDocumentProps = {
  invoiceNumber: string;
  issuedAt: string;
  client: { name: string; address: string | null; phone: string | null };
  items: {
    productName: string;
    variant: string | null;
    unit: string;
    packSize: string;
    quantity: number;
    unitPrice: number;
  }[];
  total: number;
};

export function InvoiceDocument({
  invoiceNumber,
  issuedAt,
  client,
  items,
  total,
}: InvoiceDocumentProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.businessName}>Mehmed Super Foods</Text>
          <View style={styles.invoiceMeta}>
            <Text>Invoice {invoiceNumber}</Text>
            <Text>{issuedAt}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Bill to</Text>
          <Text>{client.name}</Text>
          {client.address && <Text>{client.address}</Text>}
          {client.phone && <Text>{client.phone}</Text>}
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={styles.colProduct}>Product</Text>
            <Text style={styles.colQty}>Qty</Text>
            <Text style={styles.colUnitPrice}>Unit price</Text>
            <Text style={styles.colLineTotal}>Line total</Text>
          </View>
          {items.map((item, i) => (
            <View style={styles.tableRow} key={i}>
              <Text style={styles.colProduct}>
                {item.productName}
                {item.variant ? ` — ${item.variant}` : ""} ({item.packSize} {item.unit})
              </Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colUnitPrice}>Rs {item.unitPrice}</Text>
              <Text style={styles.colLineTotal}>
                Rs {item.quantity * item.unitPrice}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>Rs {total}</Text>
        </View>
      </Page>
    </Document>
  );
}
