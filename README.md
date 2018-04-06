# Welcome :)

This a the source code for `js-cosmic-lib`. For use in node.js or in 
browser application, you can find the built library at 
https://github.com/MisterTicot/js-cosmic-lib. You'll also find the 
documentation there.

## This is alpha release

This library is still young. This means the code is subject to partial 
rewrite and design change. This is getting more and more stable, though. 
Still, it is possible that some feature changes names or design at some 
point in the future.

## Contribute

This project is open for your contribution. I did split the source from 
the build so we can clearly see the relevant commits without polution. 
If you wish to contribute, please contact me and use the 'Issues'/'Pull 
requests' features of Github. The workflow that fit me the best is to 
have each one maintaining its repository as I'm not willing to open this 
one.

## Import in your project

You may want to use the source directly. Please note that this is 
written in JavaScript6 and may needs translation to JavaScript5 using 
babeljs.

When I wish to use the source-code directly, I usually clone it as a 
submodule in my git repository. This way I can work on both projects at 
the same time:

```shell
git submodule add https://github.com/MisterTicot/js-cosmic-lib-src cosmic-lib
git submodule init -u
```
