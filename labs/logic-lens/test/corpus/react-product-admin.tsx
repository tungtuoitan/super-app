import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { toast } from "../ui/toast";

export function ProductAdminPage() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/products", { q: query })
      .then(setProducts)
      .catch(() => toast.error("Không tải được danh sách"));
  }, [query]);

  function openEdit(p: Product) {
    setFormError("");
    setEditing({ ...p });
  }

  async function save() {
    if (!editing) return;
    if (editing.price <= 0) {
      setFormError("Giá phải lớn hơn 0");
      return;
    }
    setSaving(true);
    try {
      const saved = await api.put(`/products/${editing.id}`, editing);
      setProducts((list) => list!.map((p) => (p.id === saved.id ? saved : p)));
      setEditing(null);
      toast.success("Đã lưu");
    } catch (e) {
      setFormError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(p: Product) {
    if (!window.confirm(`Xoá ${p.name}?`)) return;
    await api.delete(`/products/${p.id}`);
    setProducts((list) => list!.filter((x) => x.id !== p.id));
    toast.success("Đã xoá");
  }

  if (!products) return <Spinner />;
  return (
    <Page title="Sản phẩm" actions={<Button onClick={() => navigate("/products/new")}>Thêm</Button>}>
      <SearchBox value={query} onChange={setQuery} />
      <ProductTable rows={products} onEdit={openEdit} onDelete={remove} />
      {editing && (
        <Dialog title="Sửa sản phẩm" onClose={() => setEditing(null)}>
          <PriceField value={editing.price} onChange={(price) => setEditing({ ...editing, price })} error={formError} />
          <Button onClick={save} disabled={saving}>Lưu</Button>
          <Button variant="ghost" onClick={() => setEditing(null)}>Huỷ</Button>
        </Dialog>
      )}
    </Page>
  );
}
