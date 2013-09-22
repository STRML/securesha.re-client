Securesha.re - Polymer
======================

This version of the Securesha.re client is built with [Polymer](http://www.polymer-project.org), Google's 
polyfill of the upcoming Web Components spec.

Development
-----------

To get started:

```bash
npm install
bower install
# Pull polymer repos
cd app/scripts/polymer && ./pull-all.sh
```

Production
----------

In production, there is no need to pull polymer repos as the grunt build will use bower's minified version.
Simply `npm install`, `bower install`, and `grunt`.