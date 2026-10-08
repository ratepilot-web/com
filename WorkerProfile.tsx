import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Camera, Lock, KeyRound, UserCircle, CheckCircle, AlertCircle } from 'lucide-react';

export const WorkerProfile: React.FC = () => {
  const { token, user, refreshUserData } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [imageUploading, setImageUploading] = useState(false);
  const [message, setMessage] = useState<{ok:boolean;text:string}|null>(null);

  const load = async () => {
    if (!token) return;
    const res = await fetch('/api/profile/me', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setProfile(await res.json());
  };
  useEffect(() => { load(); }, [token]);

  const uploadImage = async (file: File) => {
    if (!token) return; setImageUploading(true); setMessage(null);
    const fd = new FormData(); fd.append('image', file);
    const res = await fetch('/api/profile/image', { method:'POST', headers:{Authorization:`Bearer ${token}`}, body:fd });
    const data = await res.json(); setMessage({ok:res.ok,text:data.detail||'Profile image updated.'}); if(res.ok) await load(); setImageUploading(false);
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault(); setMessage(null);
    const res = await fetch('/api/profile/password', { method:'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`}, body:JSON.stringify({old_password:oldPassword,new_password:newPassword,confirm_password:confirmPassword}) });
    const data=await res.json();
    setMessage({ok:res.ok,text:data.detail||'Password changed successfully.'});
    if(res.ok){setOldPassword('');setNewPassword('');setConfirmPassword('');await refreshUserData();}
  };
  const changePin = async (e: React.FormEvent) => {
    e.preventDefault(); setMessage(null);
    const res = await fetch('/api/profile/pin', { method:'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`}, body:JSON.stringify({old_pin:oldPin,new_pin:newPin,confirm_pin:confirmPin}) });
    const data=await res.json();
    setMessage({ok:res.ok,text:data.detail||'Payment PIN changed successfully.'});
    if(res.ok){setOldPin('');setNewPin('');setConfirmPin('');await refreshUserData();}
  };

  if (!profile) return <div className="rounded-lg border bg-white p-8 text-sm text-gray-500">Loading profile...</div>;
  return <div className="space-y-6">
    <div><h1 className="text-2xl font-bold text-gray-900">My Profile</h1><p className="mt-1 text-xs text-gray-500">Manage your account, security and task-cycle information.</p></div>
    {message && <div className={`rounded-md border p-3 text-xs ${message.ok?'border-emerald-200 bg-emerald-50 text-emerald-800':'border-red-200 bg-red-50 text-red-700'}`}>{message.ok?<CheckCircle className="inline h-4 w-4 mr-2"/>:<AlertCircle className="inline h-4 w-4 mr-2"/>}{message.text}</div>}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="lg:col-span-1 rounded-lg border bg-white p-6">
        <div className="flex flex-col items-center text-center">
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-slate-100 border border-slate-200">{profile.profile_image ? <img src={profile.profile_image} className="h-24 w-24 rounded-full object-cover" alt="Profile"/> : <UserCircle className="h-16 w-16 text-slate-400"/>}<label className="absolute bottom-0 right-0 rounded-full bg-slate-900 p-2 text-white cursor-pointer" title="Change profile image"><Camera className="h-4 w-4"/><input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" disabled={imageUploading} onChange={e=>e.target.files?.[0]&&uploadImage(e.target.files[0])}/></label></div>
          <h2 className="mt-4 font-bold text-gray-900">{profile.full_name}</h2><p className="text-xs text-gray-500">@{profile.username}</p>
          <div className="mt-4 w-full rounded-md bg-slate-50 p-3 text-left"><div className="text-[10px] uppercase font-bold text-gray-500">Profile Code</div><div className="font-mono font-bold text-slate-900">{profile.profile_code}</div></div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 text-xs"><div className="rounded-md bg-gray-50 p-3"><div className="text-gray-500">Level</div><b>{profile.level}</b></div><div className="rounded-md bg-gray-50 p-3"><div className="text-gray-500">Smart Points</div><b>{profile.smart_points}</b></div></div>
      </div>
      <div className="lg:col-span-2 rounded-lg border bg-white p-6">
        <h3 className="font-bold text-gray-900">Current Task Cycle</h3><div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="rounded-md bg-slate-50 p-3"><div className="text-gray-500">Progress</div><b>{profile.cycle?.tasksCompleted ?? profile.cycle?.tasks_completed ?? 0} / 40</b></div>
          <div className="rounded-md bg-slate-50 p-3"><div className="text-gray-500">Target</div><b>${Number(profile.cycle?.targetReward ?? profile.cycle?.target_reward ?? 0).toFixed(2)}</b></div>
          <div className="rounded-md bg-slate-50 p-3"><div className="text-gray-500">Reward</div><b>${Number(profile.cycle?.rewardAccumulated ?? profile.cycle?.reward_accumulated ?? 0).toFixed(2)}</b></div>
          <div className="rounded-md bg-slate-50 p-3"><div className="text-gray-500">Task Access</div><b>{profile.task_access_approved?'Approved':'Pending'}</b></div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-md border p-4"><div className="text-xs text-gray-500">Bonus Balance</div><div className="mt-1 text-xl font-bold">${Number(profile.bonus_balance).toFixed(2)}</div></div><div className="rounded-md border p-4"><div className="text-xs text-gray-500">Earning Balance</div><div className="mt-1 text-xl font-bold text-emerald-700">${Number(profile.earning_balance).toFixed(2)}</div></div></div>
      </div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <form onSubmit={changePassword} className="rounded-lg border bg-white p-6 space-y-3"><h3 className="font-bold flex items-center gap-2"><Lock className="h-4 w-4"/>Change Login Password</h3><input type="password" placeholder="Old password" value={oldPassword} onChange={e=>setOldPassword(e.target.value)} className="w-full rounded border px-3 py-2 text-sm"/><input type="password" placeholder="New password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} className="w-full rounded border px-3 py-2 text-sm"/><input type="password" placeholder="Confirm new password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} className="w-full rounded border px-3 py-2 text-sm"/><button className="rounded bg-slate-900 px-4 py-2 text-xs font-semibold text-white">Change Password</button></form>
      <form onSubmit={changePin} className="rounded-lg border bg-white p-6 space-y-3"><h3 className="font-bold flex items-center gap-2"><KeyRound className="h-4 w-4"/>Change Payment PIN</h3><input type="password" placeholder="Old PIN" value={oldPin} onChange={e=>setOldPin(e.target.value)} className="w-full rounded border px-3 py-2 text-sm"/><input type="password" placeholder="New PIN" value={newPin} onChange={e=>setNewPin(e.target.value)} className="w-full rounded border px-3 py-2 text-sm"/><input type="password" placeholder="Confirm new PIN" value={confirmPin} onChange={e=>setConfirmPin(e.target.value)} className="w-full rounded border px-3 py-2 text-sm"/><button className="rounded bg-slate-900 px-4 py-2 text-xs font-semibold text-white">Change PIN</button></form>
    </div>
  </div>;
};
