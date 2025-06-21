export function getExpiringRecordsQuery(supabase) {
  const today = new Date();
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(today.getDate() + 3);

  const todayStr = today.toISOString().split("T")[0];
  const threeDaysStr = threeDaysFromNow.toISOString().split("T")[0];

  console.log(`📅 Query date range: ${todayStr} to ${threeDaysStr}`);

  return supabase
    .from("material_control")
    .select(
      `
      id_material_control,
      material,
      tanggal_report,
      tanggal_expire,
      status,
      supplier:id_supplier(nama),
      part_name:id_part_name(nama),
      part_number:id_part_number(nama),
      jenis_dokumen:id_jenis_dokumen(nama)
    `
    )
    .eq("status", true)
    .gte("tanggal_expire", todayStr)
    .lte("tanggal_expire", threeDaysStr);
}
