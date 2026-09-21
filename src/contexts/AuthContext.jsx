import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, db, firebaseConfigured } from '../config/firebase';

const AuthContext = createContext(null);
export function AuthProvider({children}) {
  const [user,setUser]=useState(null), [profile,setProfile]=useState(null), [loading,setLoading]=useState(true), [error,setError]=useState('');
  useEffect(()=>{
    if(!firebaseConfigured){ setLoading(false); return; }
    let mounted=true;
    let currentUid=null;
    const unsubscribe=onAuthStateChanged(auth, async u=>{
      if(!mounted)return;
      currentUid=u?u.uid:null;
      setUser(u);
      setError('');
      if(!u){
        setProfile(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      try{
        const snap=await getDoc(doc(db,'users',u.uid));
        if(!mounted||currentUid!==u.uid)return;
        setProfile(snap.exists()?snap.data():null);
      }catch(error){
        if(!mounted||currentUid!==u.uid)return;
        setProfile(null);
        setError(error.code==='permission-denied'
          ? 'Your account is signed in, but Firestore rules are not allowing profile access. Deploy firestore.rules, then refresh.'
          : 'Unable to load your account profile. Check the Firebase connection and try again.');
      }finally{
        if(mounted&&currentUid===u.uid)setLoading(false);
      }
    });
    return()=>{mounted=false;unsubscribe()};
  },[]);
  const register=async ({fullName,email,password})=>{ setError(''); if(!firebaseConfigured) throw new Error('Firebase is not configured. Add values to .env first.'); const cred=await createUserWithEmailAndPassword(auth,email,password); await updateProfile(cred.user,{displayName:fullName}); const p={uid:cred.user.uid,fullName,email,role:'customer',phone:'',address:'',createdAt:serverTimestamp(),updatedAt:serverTimestamp()}; await setDoc(doc(db,'users',cred.user.uid),p); setProfile(p); return cred.user; };
  const login=async (email,password)=>{ setError(''); if(!firebaseConfigured) throw new Error('Firebase is not configured. Add values to .env first.'); const cred=await signInWithEmailAndPassword(auth,email,password); return cred.user; };
  const logout=()=>signOut(auth);
  const updateProfileData=async data=>{ if(!user) return; await updateDoc(doc(db,'users',user.uid),{...data,updatedAt:serverTimestamp()}); setProfile(p=>({...p,...data})); };
  return <AuthContext.Provider value={{user,profile,loading,error,setError,register,login,logout,updateProfileData}}>{children}</AuthContext.Provider>;
}
export const useAuth=()=>useContext(AuthContext);
