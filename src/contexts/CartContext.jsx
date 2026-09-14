import { createContext,useContext,useEffect,useState } from 'react';
import { useAuth } from './AuthContext';
import { getCart,saveCartItem,removeCartItem,clearCart } from '../services/firestore';
const CartContext=createContext(null);
export function CartProvider({children}){ const {user}=useAuth(); const [items,setItems]=useState([]); const [message,setMessage]=useState('');
 useEffect(()=>{ if(user) getCart(user.uid).then(setItems).catch(()=>setItems([])); else setItems([]); },[user]);
 const addItem=async (p,amount=1)=>{ if(!user) throw new Error('Please login to add products to your cart.'); if(p.stock<1) throw new Error('This product is out of stock.'); const old=items.find(i=>i.productId===p.id); const quantity=(old?.quantity||0)+amount; if(quantity>p.stock) throw new Error('Quantity cannot exceed available stock.'); const item={productId:p.id,productName:p.name,price:p.price,quantity,imageUrl:p.imageUrl,stock:p.stock,addedAt:old?.addedAt||new Date().toISOString()}; await saveCartItem(user.uid,item); setItems(a=>old?a.map(i=>i.productId===p.id?item:i):[...a,item]); setMessage('Product added to cart successfully.'); };
 const changeQuantity=async(i,q)=>{ if(q<1) return removeItem(i.productId); if(q>i.stock) throw new Error('Quantity cannot exceed available stock.'); const item={...i,quantity:q}; await saveCartItem(user.uid,item); setItems(a=>a.map(x=>x.productId===i.productId?item:x)); };
 const removeItem=async id=>{ await removeCartItem(user.uid,id); setItems(a=>a.filter(i=>i.productId!==id)); setMessage('Product removed from cart.'); };
 const clear=async()=>{await clearCart(user.uid);setItems([]);setMessage('Cart cleared.');};
 return <CartContext.Provider value={{items,addItem,changeQuantity,removeItem,clear,message,setMessage,subtotal:items.reduce((s,i)=>s+i.price*i.quantity,0)}}>{children}</CartContext.Provider> }
export const useCart=()=>useContext(CartContext);
