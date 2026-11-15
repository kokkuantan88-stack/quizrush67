t=open('src/template.html').read()
for k,f in [('CHESS','chess.js'),('QUIZ','quiz.js'),('GAMES','games.js'),('APP','app.js')]:
    t=t.replace('/*__%s__*/'%k, open('src/'+f).read())
open('index.html','w').write(t)
