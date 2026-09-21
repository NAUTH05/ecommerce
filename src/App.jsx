import { Routes, Route, Link, useNavigate, useParams, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import { useCart } from './contexts/CartContext';
import { getCategories, getProducts, getProduct, getOrders, createOrder, sampleProducts } from './services/firestore';
import AdminFlow from './admin/AdminFlow';

function money(value) {
  return `$${Number(value ?? 0).toFixed(2)}`;
}

function shortId(value, length = 8) {
  return value == null ? '' : String(value).slice(0, length);
}

function normalizeProduct(product) {
  if (!product || typeof product !== 'object') return null;
  const price = Number(product.price);
  const stock = Number(product.stock);
  return {
    ...product,
    id: product.id == null ? '' : String(product.id),
    name: typeof product.name === 'string' && product.name ? product.name : 'Unnamed product',
    description: typeof product.description === 'string' ? product.description : '',
    categoryName: typeof product.categoryName === 'string' ? product.categoryName : 'Uncategorized',
    imageUrl: typeof product.imageUrl === 'string' ? product.imageUrl : '',
    price: Number.isFinite(price) ? price : 0,
    stock: Number.isFinite(stock) ? Math.max(0, Math.trunc(stock)) : 0,
  };
}

function Layout({ children }) {
  const { user, profile, logout, error } = useAuth();
  const { items } = useCart();
  return (
    <>
      <header>
        <Link className="brand" to="/">Haven<span>&</span>Co.</Link>
        <nav>
          <Link to="/products">Shop</Link>
          {user && <Link to="/orders">Orders</Link>}
          {user && <Link to="/profile">Profile</Link>}
          {profile?.role === 'admin' && <Link to="/admin">Admin</Link>}
          <Link className="cart-link" to="/cart">Bag <b>{items.length}</b></Link>
          {user ? <button className="link-btn" onClick={logout}>Logout</button> : <Link to="/login">Login</Link>}
        </nav>
      </header>
      <main>
        {error && <div className="section narrow"><Notice type="error">{error}</Notice></div>}
        {children}
      </main>
      <footer>Thoughtful goods for everyday rituals · Built for manual QA practice</footer>
    </>
  );
}

function Notice({ children, type = 'success' }) {
  return children ? <div className={`notice ${type}`}>{children}</div> : null;
}

function Protected({ children, admin = false }) {
  const { user, profile, loading } = useAuth();
  if (loading) return <div className="loading">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (admin && profile?.role !== 'admin') return <Navigate to="/forbidden" replace />;
  return children;
}

function Home() {
  return (
    <div>
      <section className="hero">
        <div>
          <p className="eyebrow">CURATED · CONSCIOUS · TIMELESS</p>
          <h1>Make room for<br /><em>what matters.</em></h1>
          <p className="hero-copy">Discover considered objects, wearable essentials, and small joys for a slower, better everyday.</p>
          <Link className="button" to="/products">Explore the collection →</Link>
        </div>
        <img src="https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=1200" />
      </section>
      <section className="section">
        <div className="section-head">
          <div>
            <p className="eyebrow">THE EDIT</p>
            <h2>Good things, gathered.</h2>
          </div>
          <Link to="/products">View all →</Link>
        </div>
        <ProductGrid products={sampleProducts.slice(0, 4)} />
      </section>
    </div>
  );
}

function ProductGrid({ products }) {
  const { addItem } = useCart();
  const [err, setErr] = useState('');
  return (
    <>
      <Notice type="error">{err}</Notice>
      <div className="product-grid">
        {products.map((p) => (
          <article className="product-card" key={p.id}>
            <Link to={`/products/${p.id}`}>
              <div className="product-image">
                <img src={p.imageUrl} />
                {Number(p.stock) === 0 && <span className="badge">Sold out</span>}
              </div>
              <div className="product-meta">
                <span>{p.categoryName}</span>
                <h3>{p.name}</h3>
                <strong>{money(p.price)}</strong>
              </div>
            </Link>
            <button
              className="quick-add"
              disabled={!p.stock}
              onClick={() => addItem(p).catch((e) => setErr(e.message))}
            >
              {p.stock ? 'Add to bag' : 'Out of stock'}
            </button>
          </article>
        ))}
      </div>
    </>
  );
}

function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    Promise.all([getProducts(), getCategories()])
      .then(([nextProducts, nextCategories]) => {
        if (cancelled) return;
        setProducts((Array.isArray(nextProducts) ? nextProducts : []).map(normalizeProduct).filter(Boolean));
        setCategories(Array.isArray(nextCategories) ? nextCategories : []);
      })
      .catch((loadError) => {
        if (cancelled) return;
        setError(loadError?.message || 'Unable to load the product catalog. Please try again.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  let shown = products.filter(
    (p) => p.name.toLowerCase().includes(search.toLowerCase()) && (category === 'all' || p.categoryId === category)
  );
  shown = [...shown].sort((a, b) =>
    sort === 'priceAsc' ? a.price - b.price
      : sort === 'priceDesc' ? b.price - a.price
        : sort === 'nameAsc' ? a.name.localeCompare(b.name)
          : sort === 'nameDesc' ? b.name.localeCompare(a.name)
            : 0
  );

  return (
    <section className="section">
      <p className="eyebrow">THE COLLECTION</p>
      <h1>Shop all</h1>
      <Notice type="error">{error}</Notice>
      <div className="toolbar">
        <input placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="all">All categories</option>
          {categories.map((c) => <option value={c.id} key={c.id}>{c.name}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="">Sort by</option>
          <option value="priceAsc">Price: low to high</option>
          <option value="priceDesc">Price: high to low</option>
          <option value="nameAsc">Name: A–Z</option>
          <option value="nameDesc">Name: Z–A</option>
        </select>
      </div>
      {loading ? <div className="loading">Loading…</div> : <ProductGrid products={shown} />}
    </section>
  );
}

function Detail({ id }) {
  const { user } = useAuth();
  const { addItem } = useCart();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [qty, setQty] = useState(1);
  const [msg, setMsg] = useState('');
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    setProduct(null);
    setQty(1);
    setMsg('');
    setActionError('');

    getProduct(id)
      .then((result) => {
        if (cancelled) return;
        setProduct(result ? normalizeProduct(result) : null);
      })
      .catch((loadError) => {
        if (cancelled) return;
        setError(loadError?.message || 'Unable to load this product.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [id]);

  if (loading) return <div className="loading">Loading…</div>;

  if (error) {
    return (
      <section className="empty">
        <p className="eyebrow">SOMETHING WENT WRONG</p>
        <h1>We couldn’t load this product.</h1>
        <Notice type="error">{error}</Notice>
        <Link className="button" to="/products">Back to shop</Link>
      </section>
    );
  }

  if (!product) {
    return (
      <section className="empty">
        <p className="eyebrow">NOT FOUND</p>
        <h1>Product not found.</h1>
        <p>It may have been removed or the link is incorrect.</p>
        <Link className="button" to="/products">Back to shop</Link>
      </section>
    );
  }

  const add = () => {
    setMsg('');
    setActionError('');
    if (!user) {
      setActionError('Please login to add products to your cart.');
      return;
    }
    addItem(product, qty)
      .then(() => setMsg('Product added to cart successfully.'))
      .catch((e) => setActionError(e.message));
  };

  return (
    <section className="section detail">
      <img src={product.imageUrl} />
      <div>
        <p className="eyebrow">{product.categoryName}</p>
        <h1>{product.name}</h1>
        <p className="price">{money(product.price)}</p>
        <p>{product.description}</p>
        <p className="stock">{product.stock ? `${product.stock} in stock` : 'Currently out of stock'}</p>
        <div className="qty">
          <button onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
          <span>{qty}</span>
          <button onClick={() => setQty(Math.min(product.stock, qty + 1))}>+</button>
        </div>
        <Notice>{msg}</Notice>
        <Notice type="error">{actionError}</Notice>
        <button className="button" disabled={!product.stock} onClick={add}>Add to bag</button>
      </div>
    </section>
  );
}

function DetailRoute() {
  const { id } = useParams();
  return <Detail id={id} />;
}

function AuthPage({ mode }) {
  const { login, register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirm: '' });
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      if (mode === 'register') {
        if (form.password !== form.confirm) throw new Error('Passwords do not match.');
        if (form.password.length < 6) throw new Error('Password must be at least 6 characters.');
        await register(form);
      } else {
        await login(form.email, form.password);
      }
      nav('/');
    } catch (x) {
      setErr(
        x.code === 'auth/email-already-in-use' ? 'Email is already registered.'
          : x.code === 'auth/invalid-credential' ? 'Invalid email or password.'
            : x.code === 'permission-denied' ? 'Account created, but Firestore rejected the profile. Deploy firestore.rules and try signing in again.'
              : x.message
      );
    }
  };

  return (
    <section className="auth">
      <div className="auth-card">
        <p className="eyebrow">{mode === 'register' ? 'WELCOME IN' : 'WELCOME BACK'}</p>
        <h1>{mode === 'register' ? 'Create your account' : 'Sign in'}</h1>
        <Notice type="error">{err}</Notice>
        <form onSubmit={submit}>
          {mode === 'register' && <input required placeholder="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />}
          <input required type="email" placeholder="Email address" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input required type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          {mode === 'register' && <input required type="password" placeholder="Confirm password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />}
          <button className="button">{mode === 'register' ? 'Create account' : 'Sign in'}</button>
        </form>
        <p>
          {mode === 'register' ? 'Already have an account?' : 'New here?'}{' '}
          <Link to={mode === 'register' ? '/login' : '/register'}>{mode === 'register' ? 'Sign in' : 'Create an account'}</Link>
        </p>
      </div>
    </section>
  );
}

function Cart() {
  const { items, subtotal, changeQuantity, removeItem, clear } = useCart();
  const [err, setErr] = useState('');

  if (!items.length) {
    return (
      <section className="empty">
        <p className="eyebrow">YOUR BAG</p>
        <h1>Nothing here yet.</h1>
        <Link className="button" to="/products">Browse the collection</Link>
      </section>
    );
  }

  return (
    <section className="section narrow">
      <p className="eyebrow">YOUR BAG</p>
      <h1>Your selections</h1>
      <Notice type="error">{err}</Notice>
      {items.map((i) => (
        <div className="cart-row" key={i.productId}>
          <img src={i.imageUrl} />
          <div>
            <h3>{i.productName || 'Unnamed product'}</h3>
            <p>{money(i.price)}</p>
          </div>
          <div className="qty">
            <button onClick={() => changeQuantity(i, i.quantity - 1).catch((e) => setErr(e.message))}>−</button>
            <span>{i.quantity}</span>
            <button onClick={() => changeQuantity(i, i.quantity + 1).catch((e) => setErr(e.message))}>+</button>
          </div>
          <strong>{money(Number(i.price) * Number(i.quantity))}</strong>
          <button className="remove" onClick={() => removeItem(i.productId).catch((e) => setErr(e.message))}>Remove</button>
        </div>
      ))}
      <div className="cart-summary">
        <span>Subtotal</span>
        <strong>{money(subtotal)}</strong>
        <Link className="button" to="/checkout">Checkout →</Link>
        <button className="text-btn" onClick={() => clear().catch((e) => setErr(e.message))}>Clear cart</button>
      </div>
    </section>
  );
}

function Checkout() {
  const { user, profile } = useAuth();
  const { items, subtotal } = useCart();
  const nav = useNavigate();
  const [form, setForm] = useState({
    fullName: profile?.fullName || '',
    phone: profile?.phone || '',
    address: profile?.address || '',
    city: '',
    note: '',
    paymentMethod: 'Cash on Delivery',
  });
  const [err, setErr] = useState('');

  if (!items.length) return <Navigate to="/cart" />;

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (!/^\+?[0-9\s-]{8,15}$/.test(form.phone)) return setErr('Please enter a valid phone number.');
    if (!form.fullName || !form.address || !form.city) return setErr('Please complete all required shipping fields.');
    try {
      const id = await createOrder({ user, items, shipping: form, paymentMethod: form.paymentMethod, total: subtotal });
      nav(`/order-success?id=${id}`);
    } catch (x) {
      setErr(x.message);
    }
  };

  return (
    <section className="section narrow">
      <p className="eyebrow">CHECKOUT</p>
      <h1>Almost yours.</h1>
      <Notice type="error">{err}</Notice>
      <form className="checkout" onSubmit={submit}>
        <label>Full name<input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></label>
        <label>Phone number<input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
        <label>Address<input required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label>
        <label>City<input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></label>
        <label>Note (optional)<textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></label>
        <label>
          Payment method
          <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
            <option>Cash on Delivery</option>
            <option>Mock Bank Transfer</option>
          </select>
        </label>
        <div className="order-total"><span>Total</span><strong>{money(subtotal)}</strong></div>
        <button className="button">Place order</button>
      </form>
    </section>
  );
}

function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.uid) {
      setOrders([]);
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    getOrders(user.uid)
      .then((result) => {
        if (!cancelled) setOrders(Array.isArray(result) ? result : []);
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError?.message || 'Unable to load your orders. Please try again.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [user?.uid]);

  return (
    <section className="section narrow">
      <p className="eyebrow">ACCOUNT</p>
      <h1>Order history</h1>
      <Notice type="error">{error}</Notice>
      {loading ? <div className="loading">Loading…</div> : !orders.length ? <p>No orders yet.</p> : orders.map((o) => (
        <div className="order-card" key={o.id}>
          <div>
            <strong>#{shortId(o.id)}</strong>
            <p>{o.customerName} · {o.city}</p>
          </div>
          <span className="status">{o.status}</span>
          <strong>{money(o.total)}</strong>
        </div>
      ))}
    </section>
  );
}

function Profile() {
  const { profile, updateProfileData } = useAuth();
  const [form, setForm] = useState({
    fullName: profile?.fullName || '',
    phone: profile?.phone || '',
    address: profile?.address || '',
  });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    setForm({
      fullName: profile?.fullName || '',
      phone: profile?.phone || '',
      address: profile?.address || '',
    });
  }, [profile]);

  const submit = async (e) => {
    e.preventDefault();
    setMsg('');
    setErr('');
    try {
      await updateProfileData(form);
      setMsg('Profile updated successfully.');
    } catch (updateError) {
      setErr(updateError?.message || 'Unable to update your profile. Please try again.');
    }
  };

  return (
    <section className="section narrow">
      <p className="eyebrow">ACCOUNT</p>
      <h1>Your profile</h1>
      <form className="checkout" onSubmit={submit}>
        <label>Full name<input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></label>
        <label>Email<input disabled value={profile?.email || ''} /></label>
        <label>Phone<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
        <label>Address<input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label>
        <Notice>{msg}</Notice>
        <Notice type="error">{err}</Notice>
        <button className="button">Save changes</button>
      </form>
    </section>
  );
}

function Success() {
  return (
    <section className="empty">
      <p className="eyebrow">THANK YOU</p>
      <h1>Your order is on its way.</h1>
      <p>We’ve received your order and will keep you posted.</p>
      <Link className="button" to="/orders">View order history</Link>
    </section>
  );
}

function Forbidden() {
  return (
    <section className="empty">
      <h1>Permission denied.</h1>
      <p>You do not have permission to access this page.</p>
      <Link to="/">Return home</Link>
    </section>
  );
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/:id" element={<DetailRoute />} />
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
        <Route path="/cart" element={<Protected><Cart /></Protected>} />
        <Route path="/checkout" element={<Protected><Checkout /></Protected>} />
        <Route path="/order-success" element={<Protected><Success /></Protected>} />
        <Route path="/orders" element={<Protected><Orders /></Protected>} />
        <Route path="/profile" element={<Protected><Profile /></Protected>} />
        <Route path="/admin/*" element={<AdminFlow />} />
        <Route path="/forbidden" element={<Forbidden />} />
      </Routes>
    </Layout>
  );
}
