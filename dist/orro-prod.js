var z=11;function ue(e,n){var t=n.attributes,r,a,f,c,o;if(!(n.nodeType===z||e.nodeType===z)){for(var N=t.length-1;N>=0;N--)r=t[N],a=r.name,f=r.namespaceURI,c=r.value,f?(a=r.localName||a,o=e.getAttributeNS(f,a),o!==c&&(r.prefix==="xmlns"&&(a=r.name),e.setAttributeNS(f,a,c))):(o=e.getAttribute(a),o!==c&&e.setAttribute(a,c));for(var I=e.attributes,O=I.length-1;O>=0;O--)r=I[O],a=r.name,f=r.namespaceURI,f?(a=r.localName||a,n.hasAttributeNS(f,a)||e.removeAttributeNS(f,a)):n.hasAttribute(a)||e.removeAttribute(a)}}var H,se="http://www.w3.org/1999/xhtml",v=typeof document>"u"?void 0:document,ce=!!v&&"content"in v.createElement("template"),fe=!!v&&v.createRange&&"createContextualFragment"in v.createRange();function le(e){var n=v.createElement("template");return n.innerHTML=e,n.content.childNodes[0]}function de(e){H||(H=v.createRange(),H.selectNode(v.body));var n=H.createContextualFragment(e);return n.childNodes[0]}function oe(e){var n=v.createElement("body");return n.innerHTML=e,n.childNodes[0]}function ve(e){return e=e.trim(),ce?le(e):fe?de(e):oe(e)}function R(e,n){var t=e.nodeName,r=n.nodeName,a,f;return t===r?!0:(a=t.charCodeAt(0),f=r.charCodeAt(0),a<=90&&f>=97?t===r.toUpperCase():f<=90&&a>=97?r===t.toUpperCase():!1)}function pe(e,n){return!n||n===se?v.createElement(e):v.createElementNS(n,e)}function ge(e,n){for(var t=e.firstChild;t;){var r=t.nextSibling;n.appendChild(t),t=r}return n}function F(e,n,t){e[t]!==n[t]&&(e[t]=n[t],e[t]?e.setAttribute(t,""):e.removeAttribute(t))}var W={OPTION:function(e,n){var t=e.parentNode;if(t){var r=t.nodeName.toUpperCase();r==="OPTGROUP"&&(t=t.parentNode,r=t&&t.nodeName.toUpperCase()),r==="SELECT"&&!t.hasAttribute("multiple")&&(e.hasAttribute("selected")&&!n.selected&&(e.setAttribute("selected","selected"),e.removeAttribute("selected")),t.selectedIndex=-1)}F(e,n,"selected")},INPUT:function(e,n){F(e,n,"checked"),F(e,n,"disabled"),e.value!==n.value&&(e.value=n.value),n.hasAttribute("value")||e.removeAttribute("value")},TEXTAREA:function(e,n){var t=n.value;e.value!==t&&(e.value=t);var r=e.firstChild;if(r){var a=r.nodeValue;if(a==t||!t&&a==e.placeholder)return;r.nodeValue=t}},SELECT:function(e,n){if(!n.hasAttribute("multiple")){for(var t=-1,r=0,a=e.firstChild,f,c;a;)if(c=a.nodeName&&a.nodeName.toUpperCase(),c==="OPTGROUP")f=a,a=f.firstChild;else{if(c==="OPTION"){if(a.hasAttribute("selected")){t=r;break}r++}a=a.nextSibling,!a&&f&&(a=f.nextSibling,f=null)}e.selectedIndex=t}}},w=1,he=11,Q=3,k=8;function b(){}function Ae(e){if(e)return e.getAttribute&&e.getAttribute("id")||e.id}function Te(e){return function(t,r,a){if(a||(a={}),typeof r=="string")if(t.nodeName==="#document"||t.nodeName==="HTML"||t.nodeName==="BODY"){var f=r;r=v.createElement("html"),r.innerHTML=f}else r=ve(r);var c=a.getNodeKey||Ae,o=a.onBeforeNodeAdded||b,N=a.onNodeAdded||b,I=a.onBeforeElUpdated||b,O=a.onElUpdated||b,te=a.onBeforeNodeDiscarded||b,U=a.onNodeDiscarded||b,ne=a.onBeforeElChildrenUpdated||b,_=a.childrenOnly===!0,m=Object.create(null),L=[];function E(s){L.push(s)}function G(s,u){if(s.nodeType===w)for(var i=s.firstChild;i;){var l=void 0;u&&(l=c(i))?E(l):(U(i),i.firstChild&&G(i,u)),i=i.nextSibling}}function x(s,u,i){te(s)!==!1&&(u&&u.removeChild(s),U(s),G(s,i))}function K(s){if(s.nodeType===w||s.nodeType===he)for(var u=s.firstChild;u;){var i=c(u);i&&(m[i]=u),K(u),u=u.nextSibling}}K(t);function q(s){N(s);for(var u=s.firstChild;u;){var i=u.nextSibling,l=c(u);if(l){var p=m[l];p&&R(u,p)?(u.parentNode.replaceChild(p,u),D(p,u)):q(u)}else q(u);u=i}}function re(s,u,i){for(;u;){var l=u.nextSibling;(i=c(u))?E(i):x(u,s,!0),u=l}}function D(s,u,i){var l=c(u);l&&delete m[l],!(!i&&(I(s,u)===!1||(e(s,u),O(s),ne(s,u)===!1)))&&(s.nodeName!=="TEXTAREA"?ae(s,u):W.TEXTAREA(s,u))}function ae(s,u){var i=u.firstChild,l=s.firstChild,p,g,y,V,h;e:for(;i;){for(V=i.nextSibling,p=c(i);l;){if(y=l.nextSibling,i.isSameNode&&i.isSameNode(l)){i=V,l=y;continue e}g=c(l);var M=l.nodeType,A=void 0;if(M===i.nodeType&&(M===w?(p?p!==g&&((h=m[p])?y===h?A=!1:(s.insertBefore(h,l),g?E(g):x(l,s,!0),l=h):A=!1):g&&(A=!1),A=A!==!1&&R(l,i),A&&D(l,i)):(M===Q||M==k)&&(A=!0,l.nodeValue!==i.nodeValue&&(l.nodeValue=i.nodeValue))),A){i=V,l=y;continue e}g?E(g):x(l,s,!0),l=y}if(p&&(h=m[p])&&R(h,i))s.appendChild(h),D(h,i);else{var C=o(i);C!==!1&&(C&&(i=C),i.actualize&&(i=i.actualize(s.ownerDocument||v)),s.appendChild(i),q(i))}i=V,l=y}re(s,l,g);var $=W[s.nodeName];$&&$(s,u)}var d=t,P=d.nodeType,X=r.nodeType;if(!_){if(P===w)X===w?R(t,r)||(U(t),d=ge(t,pe(r.nodeName,r.namespaceURI))):d=r;else if(P===Q||P===k){if(X===P)return d.nodeValue!==r.nodeValue&&(d.nodeValue=r.nodeValue),d;d=r}}if(d===r)U(t);else{if(r.isSameNode&&r.isSameNode(d))return;if(D(d,r,_),L)for(var j=0,ie=L.length;j<ie;j++){var B=m[L[j]];B&&x(B,B.parentNode,!1)}}return!_&&d!==t&&t.parentNode&&(d.actualize&&(d=d.actualize(t.ownerDocument||v)),t.parentNode.replaceChild(d,t)),d}}var be=Te(ue),Y=be;var T={eventListeners:[],intervals:[],eventQueue:me(),msgHandler:e=>{}};function J(e){return e.duration<100?(console.warn("Ignoring interval with low duration: ${interval.duration}ms"),e):(e.id=setInterval(()=>{ee({id:S(e),strategy:e.queueStrategy,msg:e.msg})},e.duration),e)}function S(e){return`${e.id}-${e.msg}-${e.duration}`}function me(){let e={queue:[],processing:!1};function n({id:r,strategy:a,action:f}){if(e.queue.length>100){console.warn("Event queue is full, dropping event",r);return}a==="dropOlder"&&(e.queue=e.queue.filter(c=>c.id!==r)),new Promise((c,o)=>{e.queue.push({id:r,action:f,resolve:c,reject:o})}),e.processing||t()}async function t(){let r=e.queue.shift();if(!!r){e.processing=!0;try{r.action(),r.resolve()}catch{r.reject()}e.processing=!1,t()}}return{enqueue:n}}function Z(e){return e.reduce((n,t)=>{let r=t.event.type;return r in n||(n[r]=[]),n[r].push({config:t.event.config,id:t.id,selector:t.selector,msg:t.msg,queueStrategy:t.queueStrategy}),n},{})}function ye(e){let n={...T.eventListeners};e.forEach(r=>{Ne(n,r.id)});let t=Z(e);Se(n,t),T.eventListeners=n}function Se(e,n){Object.entries(n).forEach(([t,r])=>{let a=e[t]||[];e[t]=a.concat(r)})}function Ne(e,n){Object.entries(e).forEach(([t,r])=>{e[t]=r.filter(a=>a.id!==n)})}function Oe(e){let n=T.intervals,t=e.map(S),r=n.map(S);n.filter(c=>{let o=S(c);return!t.includes(o)}).forEach(c=>{clearInterval(c.id)});let a=n.filter(c=>{let o=S(c);return t.includes(o)}),f=e.filter(c=>{let o=S(c);return!r.includes(o)}).map(J);T.intervals=[].concat(a,f)}function we(e,n){let t=e.target;T.eventListeners[n].filter(a=>t.matches(a.selector)).forEach(a=>{a.config.event.preventDefault&&e.preventDefault(),a.config.event.stopPropagation&&e.stopPropagation();let f=Ue(a.msg,t);ee({id:a.selector,strategy:a.queueStrategy,msg:f})})}function Ie(e){if(e.startsWith("VALUE_FROM_ID:")){let n=e.replace("VALUE_FROM_ID:",""),t=document.getElementById(n);return t&&t.value?t.value:""}return e}function Ue(e,n){if(typeof e!="object")return e;let t=Object.entries(e).map(([r,a])=>{let f=Ie(a);return[r,f]});return Object.fromEntries(t)}function ee({id:e,strategy:n,msg:t}){return T.eventQueue.enqueue({id:e,strategy:n,action(){return Le(t)}})}function Le(e){!e||T.msgHandler(e)}function Pe(e,n){let t=document.activeElement;Y(e,n,{onBeforeElUpdated(r,a){return!(r.nodeName==="INPUT"&&a.nodeName==="INPUT"&&r.isSameNode(t)&&r.value!==a.value||r.hasAttribute("unmanaged"))}})}function Ve(e,n){let t=Z(e.eventListeners),r=e.intervals.map(J);Ee(t),Object.assign(T,{eventListeners:t,intervals:r,msgHandler:n})}function Me(e){ye(e.eventListeners),Oe(e.intervals)}function Ee(e){console.log(e),Object.keys(e).forEach(n=>{document.addEventListener(n,t=>{we(t,n)},!0)})}var He={withoutValue(e){return e},tupleWithoutValue(e){return{[e]:[]}},tuple(e,n){if(!Array.isArray(n))throw new Error("Tuple values must be an array");return n.length===0&&this.tupleWithoutValue(e),n.length===1?{[e]:n[0]}:{[e]:n}},object(e,n){if(typeof n!="object")throw new Error("Value must be an object");return{[e]:n}}};export{Ve as initLogic,He as rustEnum,Pe as updateDom,Me as updateLogic};