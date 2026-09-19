/**
 * Export records to CSV with UTF-8 BOM for perfect Arabic display in Microsoft Excel.
 */
export function exportToCSV<T extends Record<string, any>>(
  filename: string,
  columns: Array<{ header: string; key: keyof T | ((item: T) => any) }>,
  data: T[]
) {
  if (!data || data.length === 0) return;

  const headerRow = columns.map((c) => `"${c.header.replace(/"/g, '""')}"`).join(",");
  const dataRows = data.map((item) =>
    columns
      .map((col) => {
        let val = typeof col.key === "function" ? col.key(item) : item[col.key];
        if (val === undefined || val === null) val = "";
        val = String(val).replace(/"/g, '""');
        return `"${val}"`;
      })
      .join(",")
  );

  const csvContent = "\uFEFF" + [headerRow, ...dataRows].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}_${new Date().toISOString().split("T")[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
