import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, getDocs, writeBatch, serverTimestamp } from 'firebase/firestore';
import 'dotenv/config';

const cfg={apiKey:process.env.VITE_FIREBASE_API_KEY,authDomain:process.env.VITE_FIREBASE_AUTH_DOMAIN,projectId:process.env.VITE_FIREBASE_PROJECT_ID,storageBucket:process.env.VITE_FIREBASE_STORAGE_BUCKET,messagingSenderId:process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,appId:process.env.VITE_FIREBASE_APP_ID};
if(!cfg.projectId) throw new Error('Missing Firebase environment variables. Copy .env.example to .env and fill it first.');
const app=initializeApp(cfg), db=getFirestore(app);
const categories=[{id:'electronics',name:'Electronics',icon:'◈'},{id:'fashion',name:'Fashion',icon:'✦'},{id:'accessories',name:'Accessories',icon:'◇'},{id:'home',name:'Home',icon:'⌂'}];
const products=[
 ['p1','Aurora Wireless Headphones',89.99,12,'electronics','Electronics'],['p2','Pixel Mini Speaker',49.99,5,'electronics','Electronics'],['p3','Everyday Smartwatch',129,0,'electronics','Electronics'],['p4','Linen Overshirt',64,18,'fashion','Fashion'],['p5','Studio Tote Bag',38,21,'fashion','Fashion'],['p6','Cloud Knit Sweater',72,7,'fashion','Fashion'],['p7','Everyday Leather Belt',34,9,'accessories','Accessories'],['p8','Arc Sunglasses',56,14,'accessories','Accessories'],['p9','Cedar Desk Clock',42,3,'accessories','Accessories'],['p10','Cloud Ceramic Vase',28,11,'home','Home'],['p11','Woven Throw Blanket',58,4,'home','Home'],['p12','Scented Soy Candle',24,25,'home','Home'],['p13','Focus Notebook Set',19,30,'accessories','Accessories'],['p14','Ceramic Travel Mug',32,8,'home','Home'],['p15','Desk Lamp No. 4',84,6,'home','Home'],['p16','Canvas Cap',26,16,'fashion','Fashion']
];
const existing=await getDocs(collection(db,'products')); if(!existing.empty){console.log('Products already exist; nothing overwritten.');process.exit(0)}
const batch=writeBatch(db);categories.forEach(c=>batch.set(doc(db,'categories',c.id),{...c,createdAt:serverTimestamp(),updatedAt:serverTimestamp()}));products.forEach(([id,name,price,stock,categoryId,categoryName])=>batch.set(doc(db,'products',id),{id,name,description:`Thoughtfully made ${name.toLowerCase()} for everyday life.`,price,stock,categoryId,categoryName,imageUrl:'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=900',createdAt:serverTimestamp(),updatedAt:serverTimestamp()}));await batch.commit();console.log(`Seeded ${categories.length} categories and ${products.length} products.`);
