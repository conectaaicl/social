'use client'
import { useEffect, useState, useCallback } from 'react'

interface Post {
  id: string; type: string; contentType: string; status: string; caption: string
  mediaUrls: string[]; thumbnailUrl: string | null; scheduledAt: string
  publishedAt: string | null; failReason: string | null; platform: string[]; attempts: number
}
interface MonitorData {
  mode: string; autoPublish: boolean
  stats: { pending_approval: number; scheduled: number; published: number; failed: number; generating: number }
  posts: Post[]
}
const SL: Record<string,string> = { PUBLISHED:'Publicado', SCHEDULED:'Programado', PENDING_APPROVAL:'Esperando Aprobacion', FAILED:'Fallido', GENERATING:'Generando...', PUBLISHING:'Publicando...' }
const SC: Record<string,string> = { PUBLISHED:'#22c55e', SCHEDULED:'#3b82f6', PENDING_APPROVAL:'#f59e0b', FAILED:'#ef4444', GENERATING:'#a78bfa', PUBLISHING:'#06b6d4' }

export default function MonitorPage() {
  const [data, setData] = useState<MonitorData | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [act, setAct] = useState<string | null>(null)
  const [pausing, setPausing] = useState(false)
  const [last, setLast] = useState<Date | null>(null)

  const load = useCallback(async () => {
    try {
      const [a,p] = await Promise.all([fetch('/api/autopilot').then(r=>r.json()),fetch('/api/posts?limit=50').then(r=>r.json())])
      const posts: Post[] = p.posts || []
      setData({ mode:a.mode, autoPublish:a.mode==='autopiloto', stats:{ pending_approval:posts.filter((x: Post)=>x.status==='PENDING_APPROVAL').length, scheduled:posts.filter((x: Post)=>x.status==='SCHEDULED').length, published:posts.filter((x: Post)=>x.status==='PUBLISHED').length, failed:posts.filter((x: Post)=>x.status==='FAILED').length, generating:posts.filter((x: Post)=>x.status==='GENERATING').length }, posts })
      setLast(new Date())
    } catch(e){console.error(e)} finally{setLoading(false)}
  }, [])

  useEffect(() => { load(); const iv=setInterval(load,20000); return ()=>clearInterval(iv) }, [load])

  const toggleAP = async () => {
    if (!data) return; setPausing(true)
    try {
      const m = data.autoPublish ? 'asistido' : 'autopiloto'
      await fetch('/api/autopilot',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:m})})
      setData(prev=>prev?{...prev,autoPublish:!prev.autoPublish,mode:m}:prev)
    } finally { setPausing(false) }
  }
  const approve = async (id: string) => {
    setAct(id+'_a')
    try { await fetch('/api/posts/'+id+'/reschedule',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:'SCHEDULED'})}); setData(prev=>prev?{...prev,posts:prev.posts.map(p=>p.id===id?{...p,status:'SCHEDULED'}:p)}:prev) } finally{setAct(null)}
  }
  const del = async (id: string) => {
    if (!confirm('Eliminar este post?')) return; setAct(id+'_d')
    try { await fetch('/api/posts/'+id,{method:'DELETE'}); setData(prev=>prev?{...prev,posts:prev.posts.filter(p=>p.id!==id)}:prev) } finally{setAct(null)}
  }
  const pubNow = async (id: string) => {
    setAct(id+'_p')
    try { await fetch('/api/posts/'+id+'/publish',{method:'POST'}); await load() } finally{setAct(null)}
  }

  const C = { bg:'#080c14',surface:'#0f1623',surface2:'#161d2e',surface3:'#1c2538',border:'rgba(255,255,255,0.06)',text:'#e2e8f0',muted:'#64748b',green:'#22c55e',red:'#ef4444',amber:'#f59e0b',blue:'#3b82f6',purple:'#a78bfa' }
  const filtered = (data?.posts??[]).filter(p=>filter==='all'||p.status===filter)
  const statRows: [string,string,string][] = [['PENDING_APPROVAL','Esperando aprobacion',C.amber],['SCHEDULED','Programados',C.blue],['GENERATING','Generando',C.purple],['FAILED','Fallidos',C.red],['PUBLISHED','Publicados',C.green]]

  return (
    <div style={{padding:'28px 32px',minHeight:'100vh',background:C.bg,color:C.text}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:28}}>
        <div>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:4}}>
            <div style={{width:10,height:10,borderRadius:'50%',background:data?.autoPublish?C.green:C.amber,boxShadow:'0 0 8px '+(data?.autoPublish?C.green:C.amber)}} />
            <h1 style={{fontSize:22,fontWeight:700,margin:0}}>Monitor de Publicaciones</h1>
          </div>
          <p style={{fontSize:13,color:C.muted,margin:0}}>Modo: <strong style={{color:data?.autoPublish?C.green:C.amber}}>{data?.mode==='autopiloto'?'Autopiloto activo':'Asistido (manual)'}</strong></p>
        </div>
        <div style={{display:'flex',gap:10}}>
          <button onClick={load} style={{padding:'8px 14px',background:C.surface2,border:'1px solid '+C.border,borderRadius:8,color:C.text,cursor:'pointer',fontSize:13}}>Actualizar</button>
          <button onClick={toggleAP} disabled={pausing} style={{padding:'8px 18px',borderRadius:8,fontSize:13,fontWeight:700,border:'none',cursor:pausing?'not-allowed':'pointer',background:data?.autoPublish?'rgba(239,68,68,0.15)':'rgba(34,197,94,0.15)',color:data?.autoPublish?C.red:C.green,opacity:pausing?0.6:1}}>
            {pausing?'...':data?.autoPublish?'Pausar publicacion':'Activar autopiloto'}
          </button>
        </div>
      </div>

      {data&&<div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:24}}>
        {statRows.map(([s,l,c])=>{
          const vals: Record<string,number> = {PENDING_APPROVAL:data.stats.pending_approval,SCHEDULED:data.stats.scheduled,GENERATING:data.stats.generating,FAILED:data.stats.failed,PUBLISHED:data.stats.published}
          return <button key={s} onClick={()=>setFilter(filter===s?'all':s)} style={{background:filter===s?c+'18':C.surface,border:'1px solid '+(filter===s?c+'40':C.border),borderRadius:12,padding:'14px 16px',textAlign:'left',cursor:'pointer'}}><div style={{fontSize:26,fontWeight:700,color:c}}>{vals[s]}</div><div style={{fontSize:11,color:C.muted,marginTop:2}}>{l}</div></button>
        })}
      </div>}

      {(data?.stats.pending_approval??0)>0&&<div style={{background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.3)',borderRadius:10,padding:'12px 16px',marginBottom:20,fontSize:13,color:'#fde68a'}}>
        {data!.stats.pending_approval} post(s) con imagen de stock esperando aprobacion antes de publicarse.
      </div>}

      <div style={{display:'flex',gap:8,marginBottom:20}}>
        {['all','PENDING_APPROVAL','SCHEDULED','PUBLISHED','FAILED'].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{padding:'6px 14px',borderRadius:20,border:'1px solid '+(filter===f?C.purple:C.border),background:filter===f?'rgba(167,139,250,0.1)':'transparent',color:filter===f?C.purple:C.muted,cursor:'pointer',fontSize:12}}>
            {f==='all'?'Todos':SL[f]??f}
          </button>
        ))}
      </div>

      {loading?<div style={{textAlign:'center',padding:60,color:C.muted}}>Cargando...</div>:
       filtered.length===0?<div style={{textAlign:'center',padding:60,color:C.muted,background:C.surface,borderRadius:12}}>No hay posts</div>:
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:14}}>
        {filtered.map(post=>(
          <div key={post.id} style={{background:C.surface,border:'1px solid '+(post.status==='PENDING_APPROVAL'?'rgba(245,158,11,0.25)':post.status==='FAILED'?'rgba(239,68,68,0.2)':post.status==='PUBLISHED'?'rgba(34,197,94,0.12)':C.border),borderRadius:12,overflow:'hidden'}}>
            <div style={{position:'relative',paddingTop:'100%',background:C.surface2}}>
              {(post.thumbnailUrl||post.mediaUrls?.[0])&&<img src={post.thumbnailUrl||post.mediaUrls[0]} alt="" style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',objectFit:'cover'}} />}
              {post.status==='PENDING_APPROVAL'&&<div style={{position:'absolute',top:8,left:8,background:'rgba(245,158,11,0.9)',color:'#000',fontSize:10,fontWeight:700,padding:'3px 8px',borderRadius:20}}>IMAGEN STOCK</div>}
              <div style={{position:'absolute',top:8,right:8,background:'rgba(0,0,0,0.75)',padding:'3px 8px',borderRadius:20,fontSize:10,fontWeight:600,color:SC[post.status]??C.muted}}>{SL[post.status]??post.status}</div>
              <div style={{position:'absolute',bottom:8,left:8,display:'flex',gap:4}}>
                {post.platform?.map(p=><span key={p} style={{background:'rgba(0,0,0,0.7)',fontSize:9,padding:'2px 6px',borderRadius:10,color:'#94a3b8'}}>{p.slice(0,2)}</span>)}
              </div>
            </div>
            <div style={{padding:'12px 14px'}}>
              <div style={{display:'flex',gap:6,marginBottom:8}}>
                <span style={{fontSize:10,padding:'2px 8px',borderRadius:10,background:'rgba(167,139,250,0.1)',color:C.purple,fontWeight:600}}>{post.type}</span>
                <span style={{fontSize:10,padding:'2px 8px',borderRadius:10,background:C.surface3,color:C.muted}}>{post.contentType}</span>
              </div>
              <p style={{fontSize:12,color:C.text,lineHeight:1.5,marginBottom:8,overflow:'hidden',maxHeight:58,display:'-webkit-box',WebkitLineClamp:3} as React.CSSProperties}>{post.caption||'Sin caption'}</p>
              <div style={{fontSize:11,color:C.muted,marginBottom:10}}>
                {post.scheduledAt&&new Date(post.scheduledAt).toLocaleString('es-CL',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}
                {post.failReason&&<div style={{color:C.red,marginTop:4,fontSize:10}}>{post.failReason.slice(0,60)}</div>}
              </div>
              <div style={{display:'flex',gap:6}}>
                {post.status==='PENDING_APPROVAL'&&<>
                  <button onClick={()=>approve(post.id)} disabled={act===post.id+'_a'} style={{flex:1,padding:'6px 10px',background:'rgba(34,197,94,0.15)',border:'1px solid rgba(34,197,94,0.25)',borderRadius:7,color:C.green,fontSize:11,fontWeight:700,cursor:'pointer'}}>{act===post.id+'_a'?'...':'Aprobar'}</button>
                  <button onClick={()=>del(post.id)} style={{padding:'6px 10px',background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:7,color:C.red,fontSize:11,cursor:'pointer'}}>X</button>
                </>}
                {post.status==='SCHEDULED'&&<>
                  <button onClick={()=>pubNow(post.id)} disabled={act===post.id+'_p'} style={{flex:1,padding:'6px 10px',background:'rgba(59,130,246,0.15)',border:'1px solid rgba(59,130,246,0.25)',borderRadius:7,color:C.blue,fontSize:11,fontWeight:600,cursor:'pointer'}}>{act===post.id+'_p'?'...':'Publicar ahora'}</button>
                  <button onClick={()=>del(post.id)} style={{padding:'6px 10px',background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:7,color:C.red,fontSize:11,cursor:'pointer'}}>X</button>
                </>}
                {post.status==='FAILED'&&<button onClick={()=>approve(post.id)} style={{flex:1,padding:'6px 10px',background:'rgba(245,158,11,0.1)',border:'1px solid rgba(245,158,11,0.2)',borderRadius:7,color:C.amber,fontSize:11,cursor:'pointer'}}>Reintentar</button>}
              </div>
            </div>
          </div>
        ))}
      </div>}
      {last&&<div style={{textAlign:'right',fontSize:11,color:C.muted,marginTop:20}}>Ultima act: {last.toLocaleTimeString('es-CL')}</div>}
    </div>
  )
}
