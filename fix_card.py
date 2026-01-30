from pathlib import Path
path = Path('web/components/ProductLibrary/ProductCard.tsx')
text = path.read_text(encoding='gb18030')
text = text.replace('currentcurrentSku.', 'currentSku.')
path.write_text(text, encoding='utf-8')
