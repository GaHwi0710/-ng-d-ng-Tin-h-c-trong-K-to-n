export const detailCollectionDefinitions = {
  CT_DonDatHang: { parent: "DonDatHang", parentField: "MaDDH" },
  CT_DonHang: { parent: "DonHang", parentField: "MaDH" },
  CT_PhieuNhap: { parent: "PhieuNhap", parentField: "MaPN" },
  CT_HoaDon: { parent: "HoaDon", parentField: "MaHD" },
  CT_PhieuXuat: { parent: "PhieuXuat", parentField: "MaPX" },
  CT_KiemKe: { parent: "KiemKe", parentField: "MaKK" },
  CT_PhieuTraHang: { parent: "PhieuTraHang", parentField: "MaPTH" },
  CT_KhuyenMai: { parent: "KhuyenMai", parentField: "MaKM" },
};

export const detailCollectionNames = Object.keys(detailCollectionDefinitions);
export const baseCollectionNames = [
  "VaiTro", "NhanVien", "KhachHang", "NhaCungCap", "LoaiHang", "SanPham",
  "DonDatHang", "PhieuNhap", "DonHang", "HoaDon", "ThanhToan", "PhieuXuat",
  "TonKho", "KiemKe", "PhieuTraHang", "KhuyenMai", "CongNo",
];

export async function ensureDetailCollections(database) {
  const existing = new Set((await database.listCollections({}, { nameOnly: true }).toArray()).map(({ name }) => name));
  await Promise.all([...baseCollectionNames, ...detailCollectionNames]
    .filter((name) => !existing.has(name))
    .map((name) => database.createCollection(name)));
}

export async function replaceDetails(database, collectionName, parentId, details, session) {
  const definition = detailCollectionDefinitions[collectionName];
  if (!definition) throw new Error(`Collection chi tiet khong hop le: ${collectionName}`);

  const options = session ? { session } : {};
  const collection = database.collection(collectionName);
  await collection.deleteMany({ [definition.parentField]: parentId }, options);
  if (!Array.isArray(details) || !details.length) return;

  const documents = details.map((detail, index) => ({
    ...normalizeDetail(detail),
    _id: detail._id || `${parentId.toString()}-${index + 1}`,
    [definition.parentField]: parentId,
    createdAt: detail.createdAt || new Date(),
  }));
  await collection.insertMany(documents, options);
}

function normalizeDetail(detail) {
  const quantity = Number(detail.SoLuong ?? detail.quantity ?? 0);
  const price = Number(detail.DonGia ?? detail.price ?? 0);
  return {
    ...detail,
    MaSP: detail.MaSP || detail.productId || detail.id,
    SoLuong: quantity,
    DonGia: price,
    ThanhTien: Number(detail.ThanhTien ?? quantity * price),
  };
}

export async function backfillDetailCollections(database) {
  for (const [collectionName, definition] of Object.entries(detailCollectionDefinitions)) {
    const detailCollection = database.collection(collectionName);
    if (await detailCollection.countDocuments()) continue;

    const parents = await database.collection(definition.parent).find({}).toArray();
    for (const parent of parents) {
      const details = parent.details || parent.items;
      if (!Array.isArray(details) || !details.length) continue;
      await replaceDetails(database, collectionName, parent._id, details);
    }
  }
}
