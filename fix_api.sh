#!/bin/bash
cd /opt/tfrm-backend/web/services
sed -i "s|'http://localhost:8000'|''|g" api.ts
cd /opt/tfrm-backend/web
npm run build
cp -r dist/* /usr/share/nginx/html/tfrm/
echo "Deployment complete"
