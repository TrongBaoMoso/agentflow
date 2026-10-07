import json,urllib.request,time
m=json.load(open('mailtm.json')); seen={}
def get(u,tok):
  r=urllib.request.Request('https://api.mail.tm'+u,headers={'authorization':'Bearer '+tok})
  return json.loads(urllib.request.urlopen(r,timeout=30).read())
end=time.time()+45*60
while time.time()<end:
  for tag,v in m.items():
    try:
      msgs=get('/messages',v['token']).get('hydra:member',[])
      for x in msgs:
        if x['id'] not in seen:
          seen[x['id']]=1; print(time.strftime('%H:%M:%S'), tag, x['from']['address'], '|', x['subject'], flush=True)
    except Exception as e: print('err',tag,str(e)[:80], flush=True)
    time.sleep(3)
  time.sleep(60)
print('done', len(seen))
