# secure-express-server

A beginning framework to create an expressjs server that is secured with user authentication and tokens.


# install

```shell
git clone https://github.com/bnielsen1965/secure-express-server
cd secure-express-server
npm install
```


# create-user.js

The initial install will have no users database. Use create-user.js to create the
first user.

> node create-user.js


# certs/createssc.js

Create self signed SSL/TLS certificate.

```shell
cd certs
node createssc.js
```
