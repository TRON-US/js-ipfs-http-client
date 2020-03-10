# Bundle js-btfs-http-client with Browserify!

> In this example, you will find a boilerplate you can use to guide yourself into bundling js-btfs-http-client with browserify, so that you can use it in your own web app!

## Setup

As for any js-btfs-http-client example, **you need a running BTFS daemon**, you learn how to do that here:

- [Spawn a go-btfs daemon](https://ipfs.io/docs/getting-started/)

**Note:** If you load your app from a different domain than the one the daemon is running (most probably), you will need to set up CORS, see https://github.com/TRON-US/js-btfs-http-client#cors to learn how to do that.

A quick (and dirty way to get it done) is:

```bash
> btfs config --json API.HTTPHeaders.Access-Control-Allow-Origin "[\"*\"]"
> btfs config --json API.HTTPHeaders.Access-Control-Allow-Credentials "[\"true\"]"
```

## Run this example

Once the daemon is on, run the following commands within this folder:

```bash
> npm install
> npm start
```

Now open your browser at `http://localhost:8888`

You should see the following:

![](https://ipfs.io/ipfs/QmNtpcWCEd6LjdPNfBFDaVZdD4jpgT8ZTAwoFJXKhYMJdo/1.png)
![](https://ipfs.io/ipfs/QmNtpcWCEd6LjdPNfBFDaVZdD4jpgT8ZTAwoFJXKhYMJdo/2.png)
