import { collection, doc, getDocs, getDoc, addDoc, setDoc, updateDoc, deleteDoc, query, where, orderBy, serverTimestamp, writeBatch, runTransaction } from 'firebase/firestore';
import { db } from '../config/firebase';

export const sampleCategories=[{id:'electronics',name:'Electronics',icon:'◈'},{id:'fashion',name:'Fashion',icon:'✦'},{id:'accessories',name:'Accessories',icon:'◇'},{id:'home',name:'Home',icon:'⌂'}];
export const sampleProducts=[
 {id:'p1',name:'Aurora Wireless Headphones',description:'Immersive over-ear sound with 30-hour battery life.',price:89.99,stock:12,categoryId:'electronics',categoryName:'Electronics',imageUrl:'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=900'},
 {id:'p2',name:'Pixel Mini Speaker',description:'Pocket-sized Bluetooth speaker with room-filling audio.',price:49.99,stock:5,categoryId:'electronics',categoryName:'Electronics',imageUrl:'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=900'},
 {id:'p3',name:'Everyday Smartwatch',description:'Track your day, sleep and notifications at a glance.',price:129,stock:0,categoryId:'electronics',categoryName:'Electronics',imageUrl:'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=900'},
 {id:'p4',name:'Linen Overshirt',description:'Breathable relaxed-fit linen layer for every season.',price:64,stock:18,categoryId:'fashion',categoryName:'Fashion',imageUrl:'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=900'},
 {id:'p5',name:'Studio Tote Bag',description:'Structured recycled canvas tote with inner pocket.',price:38,stock:21,categoryId:'fashion',categoryName:'Fashion',imageUrl:'https://images.unsplash.com/photo-1544816155-12df9643f363?w=900'},
 {id:'p6',name:'Cloud Knit Sweater',description:'Soft cotton knit with a gently oversized silhouette.',price:72,stock:7,categoryId:'fashion',categoryName:'Fashion',imageUrl:'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=900'},
 {id:'p7',name:'Everyday Leather Belt',description:'Full-grain leather belt with brushed metal buckle.',price:34,stock:9,categoryId:'accessories',categoryName:'Accessories',imageUrl:'https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=900'},
 {id:'p8',name:'Arc Sunglasses',description:'Classic acetate frames with UV400 protection.',price:56,stock:14,categoryId:'accessories',categoryName:'Accessories',imageUrl:'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=900'},
 {id:'p9',name:'Cedar Desk Clock',description:'Quiet minimalist clock with a warm wood finish.',price:42,stock:3,categoryId:'accessories',categoryName:'Accessories',imageUrl:'https://images.unsplash.com/photo-1508057198894-247b23fe5ade?w=900'},
 {id:'p10',name:'Cloud Ceramic Vase',description:'Hand-finished stoneware vase for fresh or dried stems.',price:28,stock:11,categoryId:'home',categoryName:'Home',imageUrl:'https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?w=900'},
 {id:'p11',name:'Woven Throw Blanket',description:'Textured cotton throw for slow Sunday mornings.',price:58,stock:4,categoryId:'home',categoryName:'Home',imageUrl:'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=900'},
 {id:'p12',name:'Scented Soy Candle',description:'Notes of cedar, bergamot and soft amber.',price:24,stock:25,categoryId:'home',categoryName:'Home',imageUrl:'https://images.unsplash.com/photo-1603006905003-be475563bc59?w=900'},
 {id:'p13',name:'Focus Notebook Set',description:'Three lay-flat notebooks for ideas and lists.',price:19,stock:30,categoryId:'accessories',categoryName:'Accessories',imageUrl:'https://images.unsplash.com/photo-1531346680769-a1d79b57de5c?w=900'},
 {id:'p14',name:'Ceramic Travel Mug',description:'Double-wall stoneware mug with silicone lid.',price:32,stock:8,categoryId:'home',categoryName:'Home',imageUrl:'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=900'},
 {id:'p15',name:'Desk Lamp No. 4',description:'Warm dimmable light for focused evenings.',price:84,stock:6,categoryId:'home',categoryName:'Home',imageUrl:'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=900'},
 {id:'p16',name:'Canvas Cap',description:'Unstructured cotton cap with adjustable strap.',price:26,stock:16,categoryId:'fashion',categoryName:'Fashion',imageUrl:'https://images.unsplash.com/photo-1521369909029-2afed882baee?w=900'}
];
export async function getCategories(){ const s=await getDocs(collection(db,'categories')); return s.empty?sampleCategories:s.docs.map(d=>({id:d.id,...d.data()})); }
export async function getProducts(){ const s=await getDocs(collection(db,'products')); return s.empty?sampleProducts:s.docs.map(d=>({id:d.id,...d.data()})); }
export async function getProduct(id){ const s=await getDoc(doc(db,'products',id)); return s.exists()?{id:s.id,...s.data()}:sampleProducts.find(p=>p.id===id); }
export async function getManagedCategories(){ const s=await getDocs(collection(db,'categories')); return s.docs.map(d=>({id:d.id,...d.data()})); }
export async function getManagedProducts(){ const s=await getDocs(collection(db,'products')); return s.docs.map(d=>({id:d.id,...d.data()})); }
export async function getManagedProduct(id){ const s=await getDoc(doc(db,'products',id)); return s.exists()?{id:s.id,...s.data()}:null; }
export async function getCart(uid){ const s=await getDocs(collection(db,'carts',uid,'items')); return s.docs.map(d=>({id:d.id,...d.data()})); }
export async function saveCartItem(uid,item){ await setDoc(doc(db,'carts',uid,'items',item.productId),{...item,updatedAt:serverTimestamp()}); }
export async function removeCartItem(uid,id){ await deleteDoc(doc(db,'carts',uid,'items',id)); }
export async function clearCart(uid){ const s=await getDocs(collection(db,'carts',uid,'items')); const b=writeBatch(db); s.forEach(d=>b.delete(d.ref)); await b.commit(); }
export async function getOrders(uid,isAdmin=false){ const q=isAdmin?query(collection(db,'orders'),orderBy('createdAt','desc')):query(collection(db,'orders'),where('userId','==',uid),orderBy('createdAt','desc')); const s=await getDocs(q); return s.docs.map(d=>({id:d.id,...d.data()})); }
export async function getOrder(id){ const s=await getDoc(doc(db,'orders',id)); return s.exists()?{id:s.id,...s.data()}:null; }
export async function createOrder({user,items,shipping,paymentMethod}){
 const orderRef=doc(collection(db,'orders'));
 await runTransaction(db,async tx=>{
   const live=[];
   for(const item of items){
     const productRef=doc(db,'products',item.productId), snap=await tx.get(productRef);
     if(!snap.exists()) throw new Error(`${item.productName} is no longer available.`);
     const product={id:snap.id,...snap.data()};
     if(product.stock<item.quantity) throw new Error(`Only ${product.stock} unit(s) of ${product.name} are available.`);
     live.push({productRef,cartRef:doc(db,'carts',user.uid,'items',item.productId),product,quantity:item.quantity});
   }
   const orderItems=live.map(({product,quantity})=>({productId:product.id,productName:product.name,price:Number(product.price),quantity,imageUrl:product.imageUrl||''}));
   const total=orderItems.reduce((sum,item)=>sum+item.price*item.quantity,0);
   tx.set(orderRef,{id:orderRef.id,userId:user.uid,email:user.email,customerName:shipping.fullName,phone:shipping.phone,shippingAddress:shipping.address,city:shipping.city,note:shipping.note||'',paymentMethod,total,status:'Pending',createdAt:serverTimestamp(),updatedAt:serverTimestamp(),items:orderItems});
   live.forEach(({productRef,cartRef,product,quantity})=>{tx.update(productRef,{stock:product.stock-quantity,updatedAt:serverTimestamp()});tx.delete(cartRef)});
 });
 return orderRef.id;
}
export async function upsertProduct(p){ const id=p.id||undefined; const ref=id?doc(db,'products',id):doc(collection(db,'products')); await setDoc(ref,{...p,id:ref.id,updatedAt:serverTimestamp(),createdAt:p.createdAt||serverTimestamp()}); return ref.id; }
export async function deleteProduct(id){ await deleteDoc(doc(db,'products',id)); }
export async function upsertCategory(c){ const ref=c.id?doc(db,'categories',c.id):doc(collection(db,'categories')); await setDoc(ref,{name:c.name,icon:c.icon||'◈',updatedAt:serverTimestamp(),createdAt:c.createdAt||serverTimestamp()},{merge:true}); return ref.id; }
export async function deleteCategory(id){ const products=await getManagedProducts(); if(products.some(product=>product.categoryId===id)) throw new Error('Cannot delete category because products are using it.'); await deleteDoc(doc(db,'categories',id)); }
export const orderStatuses=['Pending','Confirmed','Shipping','Completed','Cancelled'];
export async function updateOrderStatus(id,status){ if(!orderStatuses.includes(status)) throw new Error('Invalid order status.'); await updateDoc(doc(db,'orders',id),{status,updatedAt:serverTimestamp()}); }
export async function getUsers(){ const s=await getDocs(collection(db,'users')); return s.docs.map(d=>({id:d.id,...d.data()})); }
