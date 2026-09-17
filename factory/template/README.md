# Client site

Built by The LeadFlow Pro site factory. Everything this site says comes from
`site.config.json`. Deploy it to a Vercel project in the client's own account.

    npm install
    npm run dev

Set the variables in `.env.example` in the Vercel project. Flip
`launch.status` to `live` only after the domain is connected; until then the
site tells search engines not to index it.
