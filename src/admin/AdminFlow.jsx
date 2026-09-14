import { Link, NavLink, Navigate, Outlet, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  deleteCategory,
  deleteProduct,
  getManagedCategories,
  getManagedProduct,
  getManagedProducts,
  getOrder,
  getOrders,
  getUsers,
  orderStatuses,
  updateOrderStatus,
  upsertCategory,
  upsertProduct,
} from '../services/firestore';

const emptyProduct = { name: '', description: '', price: '', stock: '', categoryId: '', imageUrl: '' };

function dateValue(value) {
  if (!value) return 'Not available';
  if (typeof value.toDate === 'function') return value.toDate().toLocaleString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not available' : date.toLocaleString();
}

function money(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function ErrorMessage({ children }) {
  return children ? <div className="notice error">{children}</div> : null;
}

function SuccessMessage({ children }) {
  return children ? <div className="notice">{children}</div> : null;
}

export function AdminRoute() {
  const { user, profile, loading } = useAuth();
  if (loading) return <div className="loading">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (profile?.role !== 'admin') return <Navigate to="/forbidden" replace />;
  return <AdminLayout />;
}

function AdminLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const links = [
    ['/admin', 'Dashboard', true],
    ['/admin/products', 'Products'],
    ['/admin/categories', 'Categories'],
    ['/admin/orders', 'Orders'],
    ['/admin/users', 'Users'],
  ];

  const leave = async () => {
    await logout();
    navigate('/');
  };

  return (
    <section className="admin-shell">
      <aside className="admin-sidebar">
        <div>
          <p className="eyebrow">ADMIN SPACE</p>
          <h1>Operations</h1>
        </div>
        <nav className="admin-nav">
          {links.map(([to, label, end]) => (
            <NavLink key={to} to={to} end={end}>{label}</NavLink>
          ))}
        </nav>
        <div className="admin-nav-bottom">
          <Link to="/">Back to store</Link>
          <button className="link-btn" onClick={leave}>Logout</button>
        </div>
      </aside>
      <main className="admin-content">
        <Routes>
          <Route index element={<AdminDashboard />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="products/new" element={<ProductForm />} />
          <Route path="products/:id/edit" element={<ProductForm />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="orders/:id" element={<AdminOrderDetail />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
        <Outlet />
      </main>
    </section>
  );
}

function AdminHeading({ eyebrow, title, action }) {
  return <div className="admin-heading"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div>{action}</div>;
}

function AdminDashboard() {
  const [data, setData] = useState({ products: [], categories: [], users: [], orders: [] });
  const [error, setError] = useState('');
  useEffect(() => {
    Promise.all([getManagedProducts(), getManagedCategories(), getUsers(), getOrders('all', true)])
      .then(([products, categories, users, orders]) => setData({ products, categories, users, orders }))
      .catch((loadError) => setError(loadError.message));
  }, []);

  const completed = data.orders.filter((order) => order.status === 'Completed');
  const pending = data.orders.filter((order) => order.status === 'Pending');
  const lowStock = data.products.filter((product) => Number(product.stock) <= 5);
  const stats = [
    ['Total products', data.products.length],
    ['Total categories', data.categories.length],
    ['Customers', data.users.filter((user) => user.role !== 'admin').length],
    ['Total orders', data.orders.length],
    ['Pending orders', pending.length],
    ['Completed orders', completed.length],
    ['Completed revenue', money(completed.reduce((total, order) => total + Number(order.total), 0))],
  ];

  return <div>
    <AdminHeading eyebrow="ADMIN DASHBOARD" title="Overview" />
    <ErrorMessage>{error}</ErrorMessage>
    <div className="stats admin-stats">{stats.map(([label, value]) => <div className="stat" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
    <div className="admin-columns">
      <section className="admin-panel"><div className="admin-panel-head"><h3>Recent orders</h3><Link to="/admin/orders">View all</Link></div>{data.orders.slice(0, 5).map((order) => <Link className="admin-row" to={`/admin/orders/${order.id}`} key={order.id}><span>#{order.id.slice(0, 8)}<small>{order.customerName || order.email}</small></span><span className="status">{order.status}</span><strong>{money(order.total)}</strong></Link>)}{!data.orders.length && <p>No orders yet.</p>}</section>
      <section className="admin-panel"><div className="admin-panel-head"><h3>Stock attention</h3><Link to="/admin/products">Manage</Link></div>{lowStock.map((product) => <Link className="admin-row" to={`/admin/products/${product.id}/edit`} key={product.id}><span>{product.name}<small>{product.stock === 0 ? 'Out of stock' : 'Low stock'}</small></span><strong className={product.stock === 0 ? 'danger' : ''}>{product.stock}</strong></Link>)}{!lowStock.length && <p>All products have more than five units.</p>}</section>
    </div>
  </div>;
}

function AdminProducts() {
  const location = useLocation();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [error, setError] = useState('');
  const [message, setMessage] = useState(location.state?.message || '');
  const load = () => Promise.all([getManagedProducts(), getManagedCategories()]).then(([nextProducts, nextCategories]) => { setProducts(nextProducts); setCategories(nextCategories); }).catch((loadError) => setError(loadError.message));
  useEffect(() => { load(); }, []);
  useEffect(() => { if (location.state?.message) window.history.replaceState({}, '', location.pathname); }, [location]);
  const shown = products.filter((product) => product.name.toLowerCase().includes(search.toLowerCase()) && (category === 'all' || product.categoryId === category));
  const remove = async (product) => { if (!window.confirm(`Are you sure you want to delete ${product.name}?`)) return; setError(''); try { await deleteProduct(product.id); setProducts((items) => items.filter((item) => item.id !== product.id)); setMessage('Product deleted successfully.'); } catch (deleteError) { setError(deleteError.message); } };

  return <div>
    <AdminHeading eyebrow="CATALOG" title="Products" action={<Link className="button" to="/admin/products/new">Add product</Link>} />
    <SuccessMessage>{message}</SuccessMessage><ErrorMessage>{error}</ErrorMessage>
    <div className="toolbar admin-toolbar"><input aria-label="Search products" placeholder="Search products..." value={search} onChange={(event) => setSearch(event.target.value)} /><select aria-label="Filter products by category" value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">All categories</option>{categories.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></div>
    <section className="admin-panel admin-table"><div className="admin-table-head"><span>Product</span><span>Category</span><span>Price</span><span>Stock</span><span>Actions</span></div>{shown.map((product) => <div className="admin-table-row" key={product.id}><span><strong>{product.name}</strong><small>{product.description}</small></span><span>{product.categoryName || 'Uncategorized'}</span><span>{money(product.price)}</span><span className={Number(product.stock) === 0 ? 'danger' : Number(product.stock) <= 5 ? 'stock-warning' : ''}>{product.stock}</span><span><Link className="text-btn" to={`/admin/products/${product.id}/edit`}>Edit</Link><button className="text-btn danger" onClick={() => remove(product)}>Delete</button></span></div>)}{!shown.length && <p>No products match the current filters.</p>}</section>
  </div>;
}

function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyProduct);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(Boolean(id));
  useEffect(() => {
    getManagedCategories().then(setCategories).catch((loadError) => setError(loadError.message));
    if (id) getManagedProduct(id).then((product) => { if (!product) throw new Error('Product was not found.'); setForm({ name: product.name || '', description: product.description || '', price: product.price ?? '', stock: product.stock ?? '', categoryId: product.categoryId || '', imageUrl: product.imageUrl || '' }); setLoading(false); }).catch((loadError) => { setError(loadError.message); setLoading(false); });
  }, [id]);
  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault(); setError('');
    const price = Number(form.price); const stock = Number(form.stock);
    if (!form.name.trim()) return setError('Product name is required.');
    if (!form.description.trim()) return setError('Description is required.');
    if (!Number.isFinite(price) || price <= 0) return setError('Price must be greater than 0.');
    if (!Number.isInteger(stock) || stock < 0) return setError('Stock must be a whole number greater than or equal to 0.');
    if (!form.categoryId) return setError('Category is required.');
    try { await upsertProduct({ ...form, id, name: form.name.trim(), description: form.description.trim(), price, stock, categoryName: categories.find((item) => item.id === form.categoryId)?.name }); navigate('/admin/products', { state: { message: id ? 'Product updated successfully.' : 'Product created successfully.' } }); } catch (saveError) { setError(saveError.message); }
  };
  if (loading) return <div className="loading">Loading...</div>;
  return <div><AdminHeading eyebrow={id ? 'CATALOG / EDIT' : 'CATALOG / NEW'} title={id ? 'Edit product' : 'Add product'} /><ErrorMessage>{error}</ErrorMessage><form className="admin-form-large" onSubmit={submit}><label>Product name<input required value={form.name} onChange={update('name')} /></label><label>Description<textarea required value={form.description} onChange={update('description')} /></label><div className="admin-form-grid"><label>Price<input type="number" min="0.01" step="0.01" value={form.price} onChange={update('price')} /></label><label>Stock<input type="number" min="0" step="1" value={form.stock} onChange={update('stock')} /></label><label>Category<select value={form.categoryId} onChange={update('categoryId')}><option value="">Select category</option>{categories.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label></div><label>Image URL<input value={form.imageUrl} onChange={update('imageUrl')} /></label><div className="admin-actions"><button className="button">{id ? 'Update product' : 'Create product'}</button><Link className="text-btn" to="/admin/products">Cancel</Link></div></form></div>;
}

function AdminCategories() {
  const [categories, setCategories] = useState([]); const [name, setName] = useState(''); const [icon, setIcon] = useState('◈'); const [editing, setEditing] = useState(null); const [error, setError] = useState(''); const [message, setMessage] = useState('');
  const load = () => getManagedCategories().then(setCategories).catch((loadError) => setError(loadError.message)); useEffect(() => { load(); }, []);
  const submit = async (event) => { event.preventDefault(); setError(''); const cleanName = name.trim(); if (!cleanName) return setError('Category name is required.'); if (categories.some((item) => item.id !== editing?.id && item.name.toLowerCase() === cleanName.toLowerCase())) return setError('A category with this name already exists.'); try { await upsertCategory({ id: editing?.id, name: cleanName, icon: icon || '◈' }); setMessage(editing ? 'Category updated successfully.' : 'Category created successfully.'); setName(''); setIcon('◈'); setEditing(null); load(); } catch (saveError) { setError(saveError.message); } };
  const remove = async (category) => { if (!window.confirm(`Are you sure you want to delete ${category.name}?`)) return; setError(''); try { await deleteCategory(category.id); setCategories((items) => items.filter((item) => item.id !== category.id)); setMessage('Category deleted successfully.'); } catch (deleteError) { setError(deleteError.message); } };
  return <div><AdminHeading eyebrow="CATALOG" title="Categories" /><SuccessMessage>{message}</SuccessMessage><ErrorMessage>{error}</ErrorMessage><form className="admin-inline-form" onSubmit={submit}><input aria-label="Category name" required placeholder="Category name" value={name} onChange={(event) => setName(event.target.value)} /><input aria-label="Category icon" maxLength="2" value={icon} onChange={(event) => setIcon(event.target.value)} /><button className="button">{editing ? 'Update category' : 'Add category'}</button>{editing && <button type="button" className="text-btn" onClick={() => { setEditing(null); setName(''); setIcon('◈'); }}>Cancel</button>}</form><section className="admin-panel admin-list">{categories.map((category) => <div className="admin-row" key={category.id}><span>{category.icon || '◈'} <strong>{category.name}</strong></span><span><button className="text-btn" onClick={() => { setEditing(category); setName(category.name); setIcon(category.icon || '◈'); }}>Edit</button><button className="text-btn danger" onClick={() => remove(category)}>Delete</button></span></div>)}</section></div>;
}

function AdminOrders() {
  const [orders, setOrders] = useState([]); const [search, setSearch] = useState(''); const [status, setStatus] = useState('all'); const [error, setError] = useState(''); const [message, setMessage] = useState('');
  useEffect(() => { getOrders('all', true).then(setOrders).catch((loadError) => setError(loadError.message)); }, []);
  const shown = orders.filter((order) => `${order.id} ${order.customerName || ''} ${order.email || ''}`.toLowerCase().includes(search.toLowerCase()) && (status === 'all' || order.status === status));
  const changeStatus = async (order, nextStatus) => { setError(''); try { await updateOrderStatus(order.id, nextStatus); setOrders((items) => items.map((item) => item.id === order.id ? { ...item, status: nextStatus } : item)); setMessage('Order status updated successfully.'); } catch (updateError) { setError(updateError.message); } };
  return <div><AdminHeading eyebrow="FULFILLMENT" title="Orders" /><SuccessMessage>{message}</SuccessMessage><ErrorMessage>{error}</ErrorMessage><div className="toolbar admin-toolbar"><input aria-label="Search orders" placeholder="Search by order, customer, or email..." value={search} onChange={(event) => setSearch(event.target.value)} /><select aria-label="Filter orders by status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option>{orderStatuses.map((item) => <option key={item}>{item}</option>)}</select></div><section className="admin-panel admin-table"><div className="admin-table-head"><span>Order</span><span>Customer</span><span>Total</span><span>Status</span><span>Details</span></div>{shown.map((order) => <div className="admin-table-row" key={order.id}><span><strong>#{order.id.slice(0, 8)}</strong><small>{dateValue(order.createdAt)}</small></span><span>{order.customerName || order.email || 'Unknown customer'}</span><span>{money(order.total)}</span><span><select value={order.status} onChange={(event) => changeStatus(order, event.target.value)}>{orderStatuses.map((item) => <option key={item}>{item}</option>)}</select></span><Link className="text-btn" to={`/admin/orders/${order.id}`}>Open</Link></div>)}{!shown.length && <p>No orders match the current filters.</p>}</section></div>;
}

function AdminOrderDetail() {
  const { id } = useParams(); const [order, setOrder] = useState(null); const [error, setError] = useState(''); const [message, setMessage] = useState('');
  useEffect(() => { getOrder(id).then(setOrder).catch((loadError) => setError(loadError.message)); }, [id]);
  const changeStatus = async (nextStatus) => { try { await updateOrderStatus(id, nextStatus); setOrder((current) => ({ ...current, status: nextStatus })); setMessage('Order status updated successfully.'); } catch (updateError) { setError(updateError.message); } };
  if (error) return <div><AdminHeading eyebrow="FULFILLMENT" title="Order details" /><ErrorMessage>{error}</ErrorMessage><Link className="text-btn" to="/admin/orders">Back to orders</Link></div>;
  if (!order) return <div className="loading">Loading...</div>;
  return <div><AdminHeading eyebrow="FULFILLMENT / ORDER" title={`#${order.id.slice(0, 8)}`} action={<Link className="text-btn" to="/admin/orders">Back to orders</Link>} /><SuccessMessage>{message}</SuccessMessage><div className="order-detail-grid"><section className="admin-panel"><h3>Customer and shipping</h3><dl><dt>Customer</dt><dd>{order.customerName || 'Not available'}</dd><dt>Email</dt><dd>{order.email || 'Not available'}</dd><dt>Phone</dt><dd>{order.phone || 'Not available'}</dd><dt>Address</dt><dd>{order.shippingAddress || 'Not available'}{order.city ? `, ${order.city}` : ''}</dd><dt>Payment</dt><dd>{order.paymentMethod || 'Not available'}</dd><dt>Created</dt><dd>{dateValue(order.createdAt)}</dd></dl></section><section className="admin-panel"><h3>Order status</h3><select value={order.status} onChange={(event) => changeStatus(event.target.value)}>{orderStatuses.map((item) => <option key={item}>{item}</option>)}</select><p className="order-detail-total">Total <strong>{money(order.total)}</strong></p></section></div><section className="admin-panel"><h3>Items</h3>{(order.items || []).map((item) => <div className="admin-row" key={item.productId}><span><strong>{item.productName}</strong><small>{item.quantity} x {money(item.price)}</small></span><strong>{money(Number(item.price) * Number(item.quantity))}</strong></div>)}</section></div>;
}

function AdminUsers() {
  const [users, setUsers] = useState([]); const [search, setSearch] = useState(''); const [error, setError] = useState('');
  useEffect(() => { getUsers().then(setUsers).catch((loadError) => setError(loadError.message)); }, []);
  const shown = useMemo(() => users.filter((user) => `${user.fullName || ''} ${user.email || ''}`.toLowerCase().includes(search.toLowerCase())), [users, search]);
  return <div><AdminHeading eyebrow="PEOPLE" title="Users" /><ErrorMessage>{error}</ErrorMessage><div className="toolbar admin-toolbar"><input aria-label="Search users" placeholder="Search customers..." value={search} onChange={(event) => setSearch(event.target.value)} /></div><section className="admin-panel admin-table"><div className="admin-table-head"><span>User</span><span>Email</span><span>Role</span><span>Created</span><span>UID</span></div>{shown.map((user) => <div className="admin-table-row" key={user.id}><span><strong>{user.fullName || 'Unnamed user'}</strong></span><span>{user.email || 'Not available'}</span><span className="status">{user.role || 'customer'}</span><span>{dateValue(user.createdAt)}</span><span title={user.id}>{user.id.slice(0, 10)}...</span></div>)}{!shown.length && <p>No users match the search.</p>}</section></div>;
}

export default function AdminFlow() {
  return <AdminRoute />;
}
