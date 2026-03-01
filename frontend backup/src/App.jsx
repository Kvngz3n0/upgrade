import React, {useState} from 'react'

export default function App(){
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(false)

  function appendMessage(text, author='ai'){
    setMessages(m => [...m, {text, author, id: Date.now()+Math.random()}])
  }

  async function send(){
    const msg = input.trim()
    if(!msg) return
    appendMessage(msg, 'user')
    setInput('')
    setLoading(true)
    try{
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({message: msg})
      })
      const data = await res.json()
      const reply = data.response || 'No response'
      appendMessage(reply, 'ai')

      // add images from web_data or images list (limit to 10)
      const newImgs = (data.images || []).map(i => i.path || i.url).filter(Boolean)
      if(newImgs.length){
        setImages(prev => {
          const merged = [...newImgs, ...prev].slice(0,10)
          return merged
        })
      }

    }catch(err){
      appendMessage('Error: '+err.message, 'ai')
    }finally{setLoading(false)}
  }

  function handleSubmit(e){
    e.preventDefault(); send()
  }

  return (
    <div className="app-root">
      <header>
        <h1>RETRO AI ASSISTANT</h1>
        <p className="subtitle">black • gold • pixel</p>
      </header>
      <main>
        <section className="left">
          <div className="panel chat">
            <div className="chat-box">
              {messages.map(m=> (
                <div key={m.id} className={"message "+(m.author==='user'? 'msg-user':'msg-ai')}>{m.text}</div>
              ))}
            </div>
            <form className="chat-form" onSubmit={handleSubmit}>
              <input value={input} onChange={e=>setInput(e.target.value)} placeholder="Type a message..." />
              <button type="submit" disabled={loading}>{loading? '…' : 'SEND'}</button>
            </form>
          </div>
        </section>
        <aside className="right">
          <div className="panel gallery-panel">
            <h2>Gallery</h2>
            <div className="gallery">
              {images.map((src,idx)=> (
                <img key={idx} src={src} alt={`img-${idx}`} />
              ))}
            </div>
          </div>
        </aside>
      </main>
      <footer>Retro Black & Gold — Pixel style</footer>
    </div>
  )
}
