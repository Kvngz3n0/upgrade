(function(){
  const chatBox = document.getElementById('chatBox');
  const chatForm = document.getElementById('chatForm');
  const input = document.getElementById('messageInput');
  const gallery = document.getElementById('gallery');

  function addMessage(text, cls){
    const d = document.createElement('div');
    d.className = 'message ' + cls;
    d.textContent = text;
    chatBox.appendChild(d);
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  function addGalleryImage(url){
    const img = document.createElement('img');
    img.src = url;
    gallery.prepend(img);
    // enforce 10 images visible
    while(gallery.children.length > 10) gallery.removeChild(gallery.lastChild);
  }

  chatForm.addEventListener('submit', function(ev){
    ev.preventDefault();
    const msg = input.value.trim();
    if(!msg) return;
    addMessage(msg, 'msg-user');
    input.value = '';

    // lightweight simulated AI response (placeholder)
    addMessage('Thinking...', 'msg-ai');
    setTimeout(()=>{
      // remove 'Thinking...'
      const lastAi = Array.from(chatBox.querySelectorAll('.msg-ai')).pop();
      if(lastAi) lastAi.remove();

      // echo with style
      addMessage('Reply: ' + msg, 'msg-ai');

      // if the message contains "image" simulate adding an image
      if(/image|photo|pic/i.test(msg)){
        // placeholder images (data URIs or public images). we'll use a small SVG data URI with gold accent
        const svg = 'data:image/svg+xml;utf8,' + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400'><rect width='100%' height='100%' fill='%23000000'/><text x='50%' y='50%' font-size='24' fill='%23d4af37' font-family='monospace' dominant-baseline='middle' text-anchor='middle'>PIXEL IMAGE</text></svg>");
        addGalleryImage(svg);
      }

    }, 700 + Math.random()*500);
  });

  // Intro
  addMessage('Welcome. Retro AI ready.', 'msg-ai');

})();
