"use strict";(self.webpackChunkstudent_typescript=self.webpackChunkstudent_typescript||[]).push([[571],{7571:(e,t,n)=>{n.r(t),n.d(t,{default:()=>W});var a=n(65043),i=n(92314),o=n(96446),s=n(55263),r=n(17392),l=n(85865),c=n(688),d=n(89611),p=n(19252),u=n(60587),h=n(32143),g=n(88340),x=n(88911),m=n(38968),f=n(12220),y=n(35721),v=n(11906),b=n(84311),S=n(73216),A=n(29378),j=n(8064),w=n(67051),k=n(77154),O=n(67784),C=n(51787),N=n(63336),J=n(68903),F=n(48734),D=n(66360),I=n(55797),z=n(31063),M=n(74802),T=n(70579);const E=e=>{let{appliedFilter:t,setAppliedFilter:n,setAnchorElNav:i}=e;const s=(0,S.Zp)(),[r,c]=((0,a.useRef)(),(0,a.useState)([])),[d,p]=(0,a.useState)([]),[u,h]=(0,a.useState)([]),[g,f]=(0,a.useState)([]),[v,b]=(0,a.useState)([]),[A,j]=(0,a.useState)([]),[w,k]=(0,a.useState)([]),[E,U]=(0,a.useState)(""),[R,L]=(0,a.useState)(!1),B=(0,a.useRef)(null),[P,W]=(0,a.useState)(null),{selectedUniversities:_,setSelectedUniversities:G}=(0,a.useContext)(z.A),[H,Y]=(0,a.useState)({type:"",index:-1}),[Z,K]=(0,a.useState)(!0),$=async e=>{const t=null===e||void 0===e?void 0:e.trim();if(""!==t)try{var n,a,i,o,s,r,l;const e=await(0,I.nw)(t,1,8,0,1,1,1,1);c(null===(n=e.data)||void 0===n?void 0:n.universities),p(null===(a=e.data)||void 0===a?void 0:a.courses),h(null===(i=e.data)||void 0===i?void 0:i.disciplines),f(null===(o=e.data)||void 0===o?void 0:o.subDisciplines),b(null===(s=e.data)||void 0===s?void 0:s.country),k(null===(r=e.data)||void 0===r?void 0:r.city),j(null===(l=e.data)||void 0===l?void 0:l.state)}catch(d){}},q=e=>{let a=e,i=t.findIndex((t=>t.type===e.type));if(0!=a.data.length)if(-1==i)n([...t,a]);else{let e=[...t];e.splice(i,1,a),t=e}else n([...t.filter((t=>t.type!==e.type))])},Q=e=>{var t,n,a,o;switch(e.name){case"inputChange":const l=e.data.target.value;if(U(l),P&&clearTimeout(P),""!==e.data.target.value){const e=setTimeout((()=>{$(l)}),200);W(e)}else c([]),h([]),f([]),b([]),j([]),k([]);U(e.data.target.value),L(!0);break;case"clicksearch":const d=e.data.target.value;U(d),""!==e.data.target.value?$(d):(c([]),h([]),f([]),b([]),j([]),k([]));break;case"focus":E&&L(!0);break;case"keypress":if("Enter"===e.data.key&&""!==e.data.target.value.trim()){e.data.preventDefault(),sessionStorage.setItem("courseSearch",e.data.target.value.trim()),q({type:"name",data:e.data.target.value.trim()}),c([]),L(!1),h([]),U(""),f([]),b([]),j([]),k([]),i&&i(null);const t="activeTab=".concat(JSON.stringify("courses"),"&FilterData=").concat(encodeURIComponent(JSON.stringify([{type:"name",data:[{name:e.data.target.value,value:e.data.target.value.trim()}]}])),"&page=").concat(JSON.stringify(1),"&search=").concat(JSON.stringify("")),n=window.btoa(t);s("/explore?".concat(n))}break;case"optionChange":q({type:"universityId",data:[{name:null===(t=e.data)||void 0===t?void 0:t.name,value:null===(n=e.data)||void 0===n?void 0:n._id}]});const p=[..._,e.data];G(p),i&&i(null);const x="activeTab=".concat(JSON.stringify("courses"),"&FilterData=").concat(JSON.stringify([{type:"universityId",data:[{name:null===(a=e.data)||void 0===a?void 0:a.name,value:null===(o=e.data)||void 0===o?void 0:o._id}]}]),"&page=").concat(JSON.stringify(1),"&search=").concat(JSON.stringify("")),m=window.btoa(x);s("/explore?".concat(m)),L(!1),U("");break;case"disciplineChange":q({type:"discipline",data:e.data});const y="activeTab=".concat(JSON.stringify("courses"),"&FilterData=").concat(encodeURIComponent(JSON.stringify([{type:"discipline",data:[{name:e.data,value:e.data}]}])),"&page=").concat(JSON.stringify(1),"&search=").concat(JSON.stringify("")),v=window.btoa(y);s("/explore?".concat(v)),L(!1),U(""),i&&i(null);break;case"subDisciplineChange":q({type:"subDiscipline",data:e.data});const S="activeTab=".concat(JSON.stringify("courses"),"&FilterData=").concat(encodeURIComponent(JSON.stringify([{type:"subDiscipline",data:[{name:e.data,value:e.data}]}])),"&page=").concat(JSON.stringify(1),"&search=").concat(JSON.stringify("")),A=window.btoa(S);s("/explore?".concat(A)),L(!1),U(""),i&&i(null);break;case"countryChange":q({type:"country",data:e.data});const w="activeTab=".concat(JSON.stringify("courses"),"&FilterData=").concat(encodeURIComponent(JSON.stringify([{type:"country",data:[{name:e.data,value:e.data}]}])),"&page=").concat(JSON.stringify(1),"&search=").concat(JSON.stringify("")),O=window.btoa(w);s("/explore?".concat(O)),L(!1),U(""),i&&i(null);break;case"stateChange":q({type:"state",data:e.data});const C="activeTab=".concat(JSON.stringify("courses"),"&FilterData=").concat(encodeURIComponent(JSON.stringify([{type:"state",data:[{name:e.data,value:e.data}]}])),"&page=").concat(JSON.stringify(1),"&search=").concat(JSON.stringify("")),N=window.btoa(C);s("/explore?".concat(N)),L(!1),U(""),i&&i(null);break;case"cityChange":q({type:"city",data:e.data});const J="activeTab=".concat(JSON.stringify("courses"),"&FilterData=").concat(encodeURIComponent(JSON.stringify([{type:"city",data:[{name:e.data,value:e.data}]}])),"&page=").concat(JSON.stringify(1),"&search=").concat(JSON.stringify("")),F=window.btoa(J);s("/explore?".concat(F)),L(!1),U(""),i&&i(null);break;case"keydown":const D=r.length+u.length+g.length,I=[...r,...u,...g];if("ArrowDown"===e.data.key)e.data.preventDefault(),Y((e=>{const t=e.index<D-1?e.index+1:0;return{type:X(t),index:t}}));else if("ArrowUp"===e.data.key)e.data.preventDefault(),Y((e=>{const t=e.index>0?e.index-1:D-1;return{type:X(t),index:t}}));else if("Enter"===e.data.key&&H.index>=0){const e=I[H.index];if(e)switch(H.type){case"university":i&&i(null),q({type:"universityId",data:[{name:e,value:e}]}),s("/explore?activeTab=".concat(JSON.stringify("courses"),"&FilterData=").concat(JSON.stringify([{type:"universityId",data:[{name:e,value:e}]}]),"&page=").concat(JSON.stringify(1),"&search=").concat(JSON.stringify("")));break;case"discipline":i&&i(null),q({type:"discipline",data:[e]}),s("/explore?activeTab=".concat(JSON.stringify("courses"),"&FilterData=").concat(encodeURIComponent(JSON.stringify([{type:"discipline",data:[{name:e,value:e}]}])),"&page=").concat(JSON.stringify(1),"&search=").concat(JSON.stringify("")));break;case"subDiscipline":i&&i(null),q({type:"subDiscipline",data:[e]}),s("/explore?activeTab=".concat(JSON.stringify("courses"),'&FilterData={encodeURIComponent(JSON.stringify([{ type: "subDiscipline", data: [{ name: selectedOption, value: selectedOption }] }]))}&page=').concat(JSON.stringify(1),"&search=").concat(JSON.stringify("")))}c([]),L(!1),h([]),U(""),f([])}}},V=e=>{if(!e)return null;const t=e.name||e,n=t.toLowerCase().indexOf(E.toLowerCase());return-1===n?t:(0,T.jsxs)(T.Fragment,{children:[t.substring(0,n),(0,T.jsx)("span",{style:{fontWeight:"600",color:"rgb(254, 184, 83)"},children:t.substring(n,n+E.length)}),t.substring(n+E.length)]})},X=e=>e<r.length?"university":e<r.length+u.length?"discipline":"subDiscipline",ee=e=>{var t;null===B||void 0===B||!B.current||!e||null!==B&&void 0!==B&&null!==(t=B.current)&&void 0!==t&&t.contains(e.target)||(c([]),p([]),h([]),f([]),b([]),j([]),k([]))};return(0,a.useEffect)((()=>(document.addEventListener("click",ee),()=>{document.removeEventListener("click",ee)})),[]),(0,T.jsx)("div",{style:{display:"flex",alignItems:"center",width:"100%"},children:Z&&window.innerWidth>=600?(0,T.jsx)(D.A,{sx:{color:{xs:"#fff",md:"#3B3F76"},cursor:"pointer",fontSize:"1.35rem"},onClick:()=>K(!1)}):(0,T.jsx)(x.A,{direction:"row",spacing:3,sx:{display:"flex",flexDirection:"row",justifyContent:"center",alignItems:"center",width:"100%"},children:(0,T.jsxs)(o.A,{ref:B,sx:{width:"100%"},children:[(0,T.jsx)(O.A,{placeholder:"Search universities / programs",variant:"outlined",size:"small",fullWidth:!0,autoFocus:!0,autoComplete:"off",sx:{width:{xs:"100%",md:"250px",lg:"400px"},marginTop:"8px",position:"relative","& .MuiOutlinedInput-root":{borderRadius:"10px",color:{xs:"#3B3F76 !important"}},"& .MuiOutlinedInput-notchedOutline":{borderColor:{xs:"#3B3F76 !important"}},"& .MuiInputBase-root.MuiOutlinedInput-root ::placeholder":{color:{xs:"#3B3F76 !important"},fontSize:"14px"},"& .MuiFormControl-root":{width:"100% !important"}},onFocus:()=>Q({name:"focus",data:""}),value:E,onKeyPress:e=>{const t=e.key;/^[a-zA-Z0-9 ]+$/.test(t)||e.preventDefault(),Q({name:"keypress",data:e})},onClick:e=>Q({name:"clicksearch",data:e}),InputProps:{endAdornment:(0,T.jsx)(C.A,{position:"start",sx:{display:{xs:"none",md:"flex",alignItems:"center"}},children:(0,T.jsx)(M.A,{onClick:()=>K(!0),sx:{color:"#3B3F76",cursor:"pointer"}})})},onChange:e=>Q({name:"inputChange",data:e})}),(r.length>0||(null===d||void 0===d?void 0:d.length)>0||(null===u||void 0===u?void 0:u.length)>0||(null===g||void 0===g?void 0:g.length)>0||(null===v||void 0===v?void 0:v.length)>0||(null===w||void 0===w?void 0:w.length)>0||(null===A||void 0===A?void 0:A.length)>0)&&R&&(0,T.jsx)(N.A,{sx:{},children:(0,T.jsx)(y.A,{sx:{maxHeight:400,overflow:"auto",position:"absolute",zIndex:1,background:"#fff !important",width:"60vw",boxShadow:12,padding:"1rem",height:{md:"auto"},left:"20%"},children:(0,T.jsxs)(J.Ay,{container:!0,children:[r.length>0&&(0,T.jsxs)(J.Ay,{item:!0,xs:12,md:4,children:[r.length>0?(0,T.jsx)(l.A,{gutterBottom:!0,sx:{pl:1,fontSize:"14px",fontWeight:"500"},children:"Universities"}):"",r.map(((e,t)=>{var n,a,i;return(0,T.jsxs)(m.A,{onClick:()=>Q({name:"optionChange",data:e}),sx:{pt:0,pb:.5,backgroundColor:"university"===H.type&&H.index===t?"rgba(0, 0, 0, 0.08)":"inherit"},children:[(0,T.jsx)("img",{src:e?null===e||void 0===e?void 0:e.logoSrc:"",alt:"icon",style:{height:"25px",width:"25px",borderRadius:"10px"}}),(0,T.jsxs)(o.A,{sx:{ml:1.5},children:[(0,T.jsx)(l.A,{fontSize:"14px",children:V(e)}),(0,T.jsxs)(l.A,{fontSize:"12px",color:"rgb(122 118 118 / 60%)",children:[V(null===e||void 0===e||null===(n=e.location)||void 0===n?void 0:n.state)||V(null===e||void 0===e||null===(a=e.location)||void 0===a?void 0:a.city),", ",V(null===e||void 0===e||null===(i=e.location)||void 0===i?void 0:i.country)]})]})]},t)}))]}),(u.length>0||g.length>0)&&(0,T.jsxs)(J.Ay,{item:!0,xs:12,md:4,children:[u.length>0||g.length>0?(0,T.jsx)(l.A,{gutterBottom:!0,sx:{pl:1,fontSize:"14px",fontWeight:"600"},children:"Programs"}):"",null===u||void 0===u?void 0:u.map(((e,t)=>(0,T.jsx)(m.A,{onClick:()=>Q({name:"disciplineChange",data:e}),sx:{pt:0,pb:.5,backgroundColor:H.index===t?"rgba(0, 0, 0, 0.08)":"inherit"},children:(0,T.jsx)(F.A,{primary:V(e),sx:{"& .MuiTypography-root":{fontSize:"14px !important"}}})},t))),null===g||void 0===g?void 0:g.map(((e,t)=>(0,T.jsx)(m.A,{onClick:()=>Q({name:"subDisciplineChange",data:e}),sx:{pt:0,pb:.5,backgroundColor:H.index===t?"rgba(0, 0, 0, 0.08)":"inherit"},children:(0,T.jsx)(F.A,{primary:V(e),sx:{"& .MuiTypography-root":{fontSize:"14px !important"}}})},t)))]}),v.length>0&&(0,T.jsxs)(J.Ay,{item:!0,xs:12,md:4,children:[v.length>0?(0,T.jsx)(l.A,{gutterBottom:!0,sx:{pl:1,fontSize:"14px",fontWeight:"600"},children:"Country"}):"",v.map(((e,t)=>(0,T.jsx)(m.A,{onClick:()=>Q({name:"countryChange",data:e}),sx:{pt:0,pb:.5,backgroundColor:H.index===t?"rgba(0, 0, 0, 0.08)":"inherit"},children:(0,T.jsx)(F.A,{primary:V(e),sx:{"& .MuiTypography-root":{fontSize:"14px !important"}}})},t)))]})]})})})]})})})};var U=n(74354),R=n(24571),L=n(54536),B=n(86651),P=n(61807);const W=e=>{var t,n,O,C,N;const J=(0,S.zy)(),[F,D]=a.useState(null),[z,M]=a.useState(null),[W,_]=a.useState(null),G=new URLSearchParams(J.search);let H=G.get("exp"),Y=G.get("loginp");a.useEffect((()=>{H?_(!0):Y&&oe((0,j.DE)({show:!0,data:{container:{name:"login",dimensions:{width:"800px",height:"70%",show:"none"}},type:"custom"}}))}),[]);const Z=localStorage.getItem("coursesListInfo"),K=Z?JSON.parse(Z):null,[$,q]=a.useState("Home"),Q=[{title:"Home",link:"/"},{title:"Explore",link:"/explore?activeTab=".concat(JSON.stringify("courses"),"&FilterData=").concat(JSON.stringify(null!==K&&void 0!==K&&K.appliedFilters?K.appliedFilters:[]),"&search=").concat(JSON.stringify(null!==K&&void 0!==K&&K.search?K.search:""),"&page=").concat(JSON.stringify(null!==K&&void 0!==K&&K.page?K.page:1)),options:[{name:"Destinations",link:"/explore?activeTab=".concat(JSON.stringify("courses"),"&FilterData=").concat(JSON.stringify([]),"&page=").concat(JSON.stringify(1),"&search=").concat(JSON.stringify(""))},{name:"Universities",link:"/explore?activeTab=".concat(JSON.stringify("universities"),"&FilterData=").concat(JSON.stringify([]),"&page=").concat(JSON.stringify(1),"&search=").concat(JSON.stringify(""))},{name:"Programs",link:"/explore?activeTab=".concat(JSON.stringify("courses"),"&FilterData=").concat(JSON.stringify([]),"&page=").concat(JSON.stringify(1),"&search=").concat(JSON.stringify(""))}]},{title:"AI Course Finder",link:"/recommendations"}],V=[{path:"/profile/dashboard",name:"Dashboard",icon:(0,T.jsx)("img",{src:g.A.dashboard,alt:"dashboard",style:{width:"1.5rem",height:"1.5rem"}})},{path:"/profile/personal",name:"Profile",icon:(0,T.jsx)("img",{src:g.A.personal,alt:"dashboard",style:{width:"1.5rem",height:"1.5rem"}})},{path:"/profile/documents",name:"Documents",icon:(0,T.jsx)("img",{src:g.A.documents,alt:"dashboard",style:{width:"1.5rem",height:"1.5rem"}})},{path:"/profile/applications",name:"My Products",icon:(0,T.jsx)("img",{src:g.A.products,alt:"dashboard",style:{width:"1.5rem",height:"1.5rem"}})},{path:"/profile/recommendedCourses/generate",name:"Recommendation",icon:(0,T.jsx)("img",{src:g.A.recommendations,alt:"dashboard",style:{width:"1.5rem",height:"1.5rem"}})},{path:"/profile/shortlisted",name:"Favourites",icon:(0,T.jsx)("img",{src:g.A.wishlist,alt:"dashboard",style:{width:"1.5rem",height:"1.5rem"}})},{path:"/profile/advisors",name:"Advisors",icon:(0,T.jsx)("img",{src:g.A.experts,alt:"dashboard",style:{width:"1.5rem",height:"1.5rem"}})},{path:"/profile/orders",name:"My Orders",icon:(0,T.jsx)("img",{src:g.A.orders,alt:"dashboard",style:{width:"1.5rem",height:"1.5rem"}})},{path:"/profile/cart",name:"Cart",icon:(0,T.jsx)("img",{src:g.A.cart,alt:"dashboard",style:{width:"1.5rem",height:"1.5rem"}})},{name:"Logout",path:"",icon:(0,T.jsx)("img",{src:g.A.logout,alt:"logout",style:{width:"1.5rem",height:"1.5rem"}})}];a.useEffect((()=>{}),[K]);const[X,ee]=a.useState(!1),te=localStorage.getItem("_auth"),ne=(0,S.Zp)(),ae=(0,A.G)((e=>e.userAuthStatus)),ie=(0,A.G)((e=>e.sharedInfo)),oe=(0,A.j)();a.useEffect((()=>{(async()=>{try{const e=await k.A.get("https://ipapi.co/json/");if(e){let t=e.data.currency;localStorage.setItem("currency",t)}}catch(e){}})()}),[]);const se=e=>{switch(e.name){case"OpenUserMenu":M(e.data);break;case"OpenNavMenu":D(e.data);break;case"CloseNavMenu":if("Explore"===e.data.title)_(W?null:e.data);else{if("Programs"===e.data.title||"Universities"===e.data.title||"Destinations"===e.data.title){const t=window.btoa(e.data.link);ne("/explore?".concat(t))}else ne(e.data.link);D(null),q(e.data.title)}break;case"CloseUserMenu":"Logout"===e.data.name?(ee(!0),M(null)):(ne(e.data.path),M(null));break;case"login":D(null),oe((0,j.DE)({show:!0,data:{container:{name:"login",dimensions:{width:"800px",height:"70%",show:"none"}},type:"custom"}}));break;case"signup":D(null),oe((0,j.DE)({show:!0,data:{container:{name:"signup",dimensions:{width:"500px"}},type:"custom"}}))}},[re,le]=a.useState(null),ce=a.useRef(null),de=J.pathname.startsWith("/profile");return a.useEffect((()=>{const e=e=>{ce.current&&!ce.current.contains(e.target)&&_(null)};return W?document.addEventListener("mousedown",e):document.removeEventListener("mousedown",e),()=>{document.removeEventListener("mousedown",e)}}),[W]),(0,T.jsx)(T.Fragment,{children:(0,T.jsxs)(i.A,{position:"fixed",sx:{top:0,"&.MuiAppBar-root ":{backgroundColor:"#fff",px:{xs:0,sm:5},boxShadow:"0"}},children:[(0,T.jsx)(p.A,{maxWidth:"xl",children:(0,T.jsxs)(s.A,{disableGutters:!0,sx:{justifyContent:"space-between",alignItems:"center"},children:[(0,T.jsxs)(x.A,{direction:"row",spacing:2,sx:{alignItems:"center"},children:[(0,T.jsx)(o.A,{component:"img",src:g.A.campusrootLogo,alt:"logo",sx:{width:"150px",mr:1,cursor:"pointer"},onClick:()=>ne("/")}),(0,T.jsxs)(o.A,{sx:{position:"relative",display:{xs:"none",md:"flex"}},children:[Q.map((e=>(0,T.jsx)(m.A,{onClick:()=>{se({name:"CloseNavMenu",data:e})},sx:{display:"block",position:"relative",color:$===e.title&&J.pathname===e.link&&!de||"Explore"===e.title&&(null!==W||J.pathname.startsWith("/explore"))?"#3B3F76":"rgba(48, 51, 99, 0.5)",textTransform:"capitalize",fontSize:"1rem",fontWeight:600},children:(0,T.jsx)(o.A,{sx:{display:{xs:"none",md:"block"}},children:e.title})},e.title))),W&&(0,T.jsxs)(T.Fragment,{children:[(0,T.jsx)(f.A,{open:!0,sx:P.dY.backdropFilter,onClick:()=>_(null)}),(0,T.jsx)(o.A,{sx:P.dY.explorepop,children:(0,T.jsx)(y.A,{sx:P.dY.listRef,ref:ce,children:(0,T.jsx)(R.A,{setopen:_})})})]})]}),(0,T.jsx)(o.A,{sx:{alignItems:"center"},children:(0,T.jsx)(E,{appliedFilter:e.appliedFilter,setAppliedFilter:e.setAppliedFilter})})]}),(0,T.jsxs)(x.A,{direction:"row",spacing:2,alignItems:"center",children:[(0,T.jsxs)(o.A,{sx:{flexGrow:0},children:[null!==(t=ae.data)&&void 0!==t&&t.isAuthorized?de?(0,T.jsx)(b.S,{handleSubmit:()=>ee(!0),width:"100px",children:"Logout"}):(0,T.jsx)(o.A,{sx:{display:"flex",justifyContent:"space-between",alignItems:"center",height:"50px",gap:"20px"},children:(0,T.jsx)(r.A,{onClick:e=>{se({name:"OpenUserMenu",data:e.currentTarget})},sx:{p:0},children:(0,T.jsx)(u.A,{alt:"profile",src:null===ie||void 0===ie||null===(n=ie.data)||void 0===n?void 0:n.displayPicSrc})})}):(0,T.jsx)(o.A,{sx:{display:{xs:"none",md:"flex"},flexDirection:"row",gap:"1rem"},children:(0,T.jsxs)(v.A,{onClick:()=>se({name:"login"}),sx:P.zr,children:[(0,T.jsx)(w.A,{sx:{mr:.5,fontSize:"1.4rem"}}),"Login"]})}),(0,T.jsxs)(c.A,{sx:{mt:"45px"},id:"menu-appbar",anchorEl:z,anchorOrigin:{vertical:"top",horizontal:"right"},keepMounted:!0,transformOrigin:{vertical:"top",horizontal:"right"},open:Boolean(z),onClose:()=>{se({name:"CloseUserMenu",data:""})},children:[(0,T.jsxs)(o.A,{sx:{display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",gap:"0.5rem"},children:[(0,T.jsx)(u.A,{alt:"profile",src:null===ie||void 0===ie||null===(O=ie.data)||void 0===O?void 0:O.displayPicSrc}),(0,T.jsx)(l.A,{color:"#3b3f76",children:null===ie||void 0===ie||null===(C=ie.data)||void 0===C?void 0:C.firstName})]}),V.map((e=>(0,T.jsxs)(h.A,{onClick:()=>{se({name:"CloseUserMenu",data:e})},sx:{display:"flex",gap:"5px",marginLeft:"5px","&:hover":{background:"#d8d8e9",borderRadius:"10px"},minHeight:"40px"},children:[e.icon,(0,T.jsx)(l.A,{textAlign:"center",color:"#3b3f7691",sx:{fontWeight:"500","&:hover":{color:"#3b3f76"}},children:e.name})]},e.name)))]})]}),(0,T.jsxs)(o.A,{sx:{flexGrow:1,display:{xs:"flex",md:"none"}},children:[(0,T.jsx)(r.A,{size:"large","aria-label":"account of current user","aria-controls":"menu-appbar","aria-haspopup":"true",onClick:e=>{se({name:"OpenNavMenu",data:e.currentTarget})},children:(0,T.jsx)(d.A,{})}),(0,T.jsxs)(c.A,{id:"menu-appbar",anchorEl:F,anchorOrigin:{vertical:"bottom",horizontal:"left"},keepMounted:!0,transformOrigin:{vertical:"top",horizontal:"left"},PaperProps:{style:{left:"0 !important"}},open:Boolean(F),onClose:()=>D(null),sx:{display:{xs:"block",md:"none"},width:"100%","& .MuiPaper-root":{width:"100%"},"& .MuiList-root":{p:2,height:"100vh"}},children:[(0,T.jsx)(o.A,{sx:{display:{md:"none",xs:"flex"},mb:2},children:(0,T.jsx)(E,{appliedFilter:e.appliedFilter,setAppliedFilter:e.setAppliedFilter,setAnchorElNav:D})}),(0,T.jsxs)(x.A,{direction:"column",children:[Q.map(((e,t)=>(0,T.jsxs)(a.Fragment,{children:[(0,T.jsxs)(h.A,{onClick:()=>{e.options?(e=>{le(re===e?null:e)})(t):se({name:"CloseNavMenu",data:e})},sx:{minHeight:"35px",display:"flex",justifyContent:"space-between",alignItems:"center"},children:[(0,T.jsx)(l.A,{textAlign:"center",color:"#3b3f76",children:e.title}),e.options&&(0,T.jsx)(L.A,{sx:{color:"#3b3f76"}})]}),e.options&&re===t&&e.options.map((e=>(0,T.jsx)(h.A,{onClick:()=>{se({name:"CloseNavMenu",data:{title:e.name,link:e.link}}),le(null)},sx:{pl:4,borderBottom:"0.5px solid gray"},children:(0,T.jsx)(l.A,{textAlign:"center",color:"#3b3f76",children:e.name})},e.name)))]},e.title))),null!==(N=ae.data)&&void 0!==N&&N.isAuthorized?"":(0,T.jsx)(x.A,{direction:"column",sx:{display:{xs:"flex",lg:"none"},justifyContent:"center",alignItems:"center",mt:2},spacing:2,children:(0,T.jsxs)(v.A,{onClick:()=>se({name:"login"}),sx:{border:"2px solid #3b3f76",color:"#fff",fontWeight:"600",fontSize:"16px",textTransform:"none",width:"100px",padding:"2px",borderRadius:"20px",background:"#3b3f76"},children:[(0,T.jsx)(w.A,{sx:{mr:.5,fontSize:"1.4rem",color:"#fff"}}),"Login"]})})]})]})]})]})]})}),(0,T.jsx)(B.A,{open:X,handleClose:()=>ee(!1),additionalData:{onSubmit:async()=>{if(ee(!1),(0,U.ri)(),ne("/"),localStorage.removeItem("_auth"),te)try{await(0,I.dy)()&&(window.location.href="/")}catch(e){}},title:"Are you sure you want to logout?",content:""}})]})})}}}]);
//# sourceMappingURL=571.b12847b3.chunk.js.map