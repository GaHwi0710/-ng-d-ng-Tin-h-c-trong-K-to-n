# Cấu trúc project

## Sitemap nội bộ

```text
/login
/forgot-password
/dashboard
/customers
/suppliers
/products
/products/categories
/purchase-orders
/goods-receipts
/sales-orders
/invoices
/goods-issues
/inventory
/stocktakes
/returns
/debts
/promotions
/reports
/admin/employees
/admin/roles
```

## Phân quyền

| Vai trò | Module |
|---|---|
| Quản lý | Toàn bộ hệ thống, báo cáo, nhân viên, phân quyền |
| Kế toán | Hóa đơn, thanh toán, công nợ, báo cáo doanh thu |
| Nhân viên bán hàng | Khách hàng, đơn bán hàng, hóa đơn, trả hàng |
| Nhân viên kho | Sản phẩm, nhập kho, xuất kho, tồn kho, kiểm kê |
| Nhà cung cấp | Xác nhận đơn nhập hàng, đối chiếu giao hàng |
| Khách hàng | Xem sản phẩm, đặt hàng, thanh toán, theo dõi đơn |

## Quy ước backend module

Mỗi module dùng cấu trúc:

```text
module.route.js      -> định nghĩa endpoint
module.controller.js -> nhận request/response
module.service.js    -> xử lý nghiệp vụ
module.model.js      -> ánh xạ dữ liệu/ORM sau này
```

## Lộ trình đề xuất

1. Dựng database và seed dữ liệu mẫu.
2. Hoàn thiện Auth, JWT và role middleware.
3. Làm CRUD cho khách hàng, nhà cung cấp, sản phẩm.
4. Làm luồng mua hàng -> nhập kho -> cập nhật tồn kho.
5. Làm luồng bán hàng -> hóa đơn -> thanh toán -> xuất kho.
6. Bổ sung kiểm kê, trả hàng, khuyến mãi, công nợ.
7. Hoàn thiện dashboard và báo cáo.
