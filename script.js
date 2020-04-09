if (typeof dinForms == "undefined" || dinForms.version < 1.3) {
    var dinForms = {
        version:1.3,
        onLoad: function(){
            //
            var forms = document.getElementsByClassName("formIntegration");
            for (var k = 0; k < forms.length; ++k) {
                var inputElement = forms[k].getElementsByClassName("din-input-mask");
                for (var i = 0; i < inputElement.length; ++i) {
                    switch(inputElement[i].getAttribute("din-mask-type")){
                        case "DT":
                        case "DH":
                            var str = inputElement[i].getAttribute("format");
                            VMasker(inputElement[i]).maskPattern(str.replace(/D|M|A|Y|H/g, "9"));
                            break;
                        case "INT":
                            VMasker(inputElement[i]).maskNumber();
                            break;
                        case "FLT":
                            var str = inputElement[i].getAttribute("format");
                            VMasker(inputElement[i]).maskMoney({separator:str});
                            break;
                    }
                }                
            }

            //
            var referer = document.referrer ? document.referrer.match(/:\/\/(.[^/]+)/)[1] : "";
            var hostname = window.location.hostname;
            if (referer != hostname) {
                var jsonParams = {"url":window.location.href, "referer":document.referrer};
                var cookieData = btoa(JSON.stringify(jsonParams));
                dinForms.SetCookie("dinTrafficSource", cookieData, 90);
            }
        },
        ValidateForm: function(form){
            this.LimpaAvisos(form);

            /********************************************************/
            // validação de cada tipo de campo
            /********************************************************/
            var elem = form.elements;
            var enviar = true;
            for(var i = 0; i < elem.length; i++){
                if( elem[i].type == "hidden" ){
                    continue
                }

                var classList = elem[i].className.split(" ");

                this.removeClass("field-error", elem[i]);
                elem[i].value = elem[i].value.trim();
                
                if(classList.indexOf("type_EMAIL") != -1){
                    if(!this.validateEmail(elem[i].value) ){
                        this.addClass("field-error", elem[i]);
                        enviar = false;
                    }
                }
                else if(classList.indexOf("type_DT") != -1){
                    if(elem[i].value != "" && !this.existDate(this.prepareDate(elem[i].value, elem[i].getAttribute("format")),false)){
                        this.addClass("field-error", elem[i]);
                        enviar = false;
                    }
                }
                else if(classList.indexOf("type_DH") != -1){
                    if(elem[i].value != "" && !this.existDate(this.prepareDate(elem[i].value, elem[i].getAttribute("format")),true)){
                        this.addClass("field-error", elem[i]);
                        enviar = false;
                    }
                }
                else if( classList.indexOf("type_PHN_NUM") != -1 ){
                    var fieldName = elem[i].getAttribute("hd-name");
                    var text = elem[i].value;
                    var patPhone = /\d+/g;
                    var res;
                    var resultNum = "";
                    var resultDDI = "";
                    res = text.match(patPhone);

                    if (res !== null){
                         resultNum = res.join("");
                    }

                    form.elements[fieldName].value = "";

                    if(text != "" && resultNum.length < 3 ){
                        this.addClass("field-error", elem[i]);
                        enviar = false;
                    }else if (resultNum.length >= 3 ){

                        text = form.elements[fieldName+"_DDI"].value
                        res = text.match(patPhone);

                        if (res !== null){
                            resultDDI = res.join("");
                            form.elements[fieldName].value = resultDDI+resultNum;
                        }else{
                            this.addClass("field-error", form.elements[fieldName+"_DDI"]);
                            enviar = false;
                        }
                    }
                }

                // CAMPOS OBRIGATORIOS
                if( classList.indexOf("field-required") != -1 ){

                    // Todos os campos não-LVM
                    if(classList.indexOf("type_LVM") == -1){
                        if( elem[i].value.trim() == "" ){
                            this.addClass("field-error", elem[i]);
                            enviar = false;
                        }
                    }

                    // else lvm...
                    if(classList.indexOf("type_LVM") != -1){
                        var hdName = elem[i].getAttribute("hd-name");
                        var ok = false;

                        this.removeClass("field-error", form.getElementsByClassName("containerMultiple_"+hdName)[0]); // é o único caso que a classe é removida deste jeito

                        var checkboxes = form.getElementsByClassName("chk_"+hdName);
                        for(var j=0; j < checkboxes.length; j++){
                            if(checkboxes[j].checked == true){
                                ok = true;
                                break;
                            }
                        }
                        if(!ok){
                            this.addClass("field-error", form.getElementsByClassName("containerMultiple_"+hdName)[0] );
                            enviar = false;
                        }
                    }
                }
                
            }
            /********************************************************/
            // Em caso de falha na validação...
            // Mensagem de Campo Obrigatório
            /********************************************************/
            if(!enviar){
                var msgError = form.getElementsByClassName("DinamizeDivMessageError")[0];
                if(msgError && msgError.innerHTML.length) {
                    msgError.style.display = "block";
                }
                return false
            }

            /********************************************************/
            // Escreve valores nos campos hidden (quando necessário)
            /********************************************************/

            // Listas de Valores Multiplos (LVM)
            var lvmElements = form.getElementsByClassName("type_LVM");
            var checkboxes, checkedValues;
            var hdName;
            for (var i = 0; i < lvmElements.length; i++) {
                hdName = lvmElements[i].getAttribute("hd-name");

                checkboxes = form.getElementsByClassName("chk_"+hdName);
                checkedValues = "";

                if(checkboxes.length > 0){
                    for (var k = 0; k < checkboxes.length; k++) {
                        if(checkboxes[k].checked){
                            checkedValues += "|"+checkboxes[k].value;
                        }
                    }
                }
                checkedValues = checkedValues.replace("|","");
                form.elements[lvmElements[i].getAttribute("hd-name")].value = checkedValues;
            }

            // Datas
            this.setDateValues(form, "type_DT");
            this.setDateValues(form, "type_DH");
            
            // Floats
            var fltElements = form.getElementsByClassName("type_FLT");
            for (var i = 0; i < fltElements.length; i++) {
                form.elements[fltElements[i].getAttribute("hd-name")].value = fltElements[i].value.replace(",",".");
            };

            /********************************************************/
            // finalizando...
            /********************************************************/

            //  se for preview... dá msg de sucesso e cai fora!
            var isPreview = form.elements["isPreview"];
            if (isPreview) {
                dinForms.ResetFormValues(form);
                return false
            }

            // LEADTRACKER
            // Precisamos descobrir se o objeto de leadTracker existe no mesmo frame que este formulário está, ou se está no parent (ou no top).
            // Usamos a referencia deste frame a partir disto.
            // Para ter o máximo de compatibilidade, verifico se o browser suporta estes objetos.
            // Resolve idealmente o uso de leadtracker por popups

            // faz try-catch pois o frame parent/top pode ser de outro dominio, isto gerará um erro do tipo cross-domain.
            try {
                var frame
                if (typeof dinLeadTracker !== "undefined") {
                    frame = window;
                } else if (typeof window.parent !== "undefined" && typeof window.parent.dinLeadTracker !== "undefined") {
                    frame = window.parent;
                } else if (typeof window.top !== "undefined" && typeof window.top.dinLeadTracker !== "undefined") {
                    frame = window.top;
                }

                // se encontramos leadtracker em algum dos frames, seta!
                if ( typeof frame !== "undefined" && frame.dinLeadTracker.isActive()) {
                    var formElements = form.elements;
                    if ( typeof formElements.cmp1 !== "undefined" ) {
                        frame.dinLeadTracker.SetLeadEmail(formElements.cmp1.value);
                    }
                    if ( typeof formElements.cmp3 !== "undefined" ) {
                        frame.dinLeadTracker.SetLeadExternalId(formElements.cmp3.value);
                    }
                }
            }
            catch(e){
                console.warn("Leadtracker ignored because of Cross-Domain error.");
                console.warn(e);
            }

            var isCaptcha = this.hasCaptcha(form);
            if(isCaptcha){
                form.getElementsByClassName("DinamizeDivCaptchaMessage")[0].style.display = "none";
                var recaptcha = form.elements["g-recaptcha-response"];
                if (recaptcha.value === ""){
                    form.getElementsByClassName("DinamizeDivCaptchaMessage")[0].style.display = "block";
                    grecaptcha.reset(); // ver se precisa
                    return false;
                }
            }

            // Se o form usa "msg", não faz action com redirect.
            var isMsg = form.elements["isMsg"].value;
            var redirectElement = form.elements["redirect-url-js"] ? form.elements["redirect-url-js"] : form.elements["redirect-url-pp"];
            if(isMsg == "true" || (redirectElement && redirectElement.value != "") ){
                this.LoadingForm(form);
                return false; // posta o conteudo, mas não executa action do form
            }

            // Posta pro nosso receiver e este fará um redirect.
            return true;
        },
        setDateValues: function(form, className){
            var dtElements = form.getElementsByClassName(className);
            for (var i = 0; i < dtElements.length; i++) {
                if (dtElements[i].value == "") {
                    continue;
                }
                form.elements[dtElements[i].getAttribute("hd-name")].value = this.prepareDate(dtElements[i].value, dtElements[i].getAttribute("format"));
            };
        },
        // NOVO, apenas landing page
        SetCookie: function(cname, cvalue, exdays){
            var d = new Date();
            d.setTime(d.getTime() + (exdays*24*60*60*1000));
            var expires = "expires="+ d.toUTCString();
            document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
        },
        hasCaptcha: function(form){
            // Detecta se existe este elemento (deprecated) de captcha.
            if (form.elements["dnz-captcha-google"] != undefined) {
                return true;
            }
            // Validação normal
            var action = form.getAttribute("action");
            if (action === null) {
                return false;
            }

            action = action.split("/");
            if (action.length == 8){
                if(action[7] == 1){
                    return true;
                }
            }
            return false;
        },
        LoadingForm: function(form){
            //
            if (document.getElementById("DinamizeIframeFormIntegration") == undefined){
                var ifrm = document.createElement("iframe");
                ifrm.setAttribute("id", "DinamizeIframeFormIntegration");
                ifrm.setAttribute("name", "DinamizeIframeFormIntegration");
                ifrm.style.display = "none";
                document.body.appendChild(ifrm);
            }

            if (this.GetCookie("dinTrafficSource")) {
                // MANTER COM ID, SÓ PRECISAMOS DE UM POR document
                if (document.getElementById("__dinTrafficSource")) {
                    document.getElementById("__dinTrafficSource").setAttribute("value", this.GetCookie("dinTrafficSource"));
                } else {
                    var ts = document.createElement("input");
                    ts.type = "hidden";
                    ts.name = "__dinTrafficSource";
                    // MANTER COM ID, SÓ PRECISAMOS DE UM POR document
                    ts.id = "__dinTrafficSource";
                    ts.value = this.GetCookie("dinTrafficSource");
                    form.appendChild(ts);               
                }
            }

            this.Spinner(form, true);

            var redirectElement = form.elements["redirect-url-pp"];
            if (redirectElement && redirectElement.value != "") {
                this.Request(form.getAttribute("action")+"/", this.serialize(form), form);
            } else {
                // Usa um "img" para fazer uma requisição
                var imgReq = document.createElement("img");
                imgReq.setAttribute("id", "DinamizeImgResponse");
                imgReq.style.display = "none"; // redundancia

                imgReq.onload = function () {
                     // LandingPage
                    redirectElement = form.elements["redirect-url-js"];
                    if (redirectElement && redirectElement.value != "") {
                        location.href = redirectElement.value;
                    }
                    // Fim LandingPage
                    dinForms.Spinner(form, false);
                    dinForms.ResetFormValues(form);
                }
                imgReq.onerror = function () {
                    dinForms.Spinner(form, false);

                    // elemento deprecated
                    var msgErrorDep = form.getElementsByClassName("divMessageError")[0];
                    if(msgErrorDep) {
                        msgErrorDep.style.display = "block";
                    }

                    var msgAlert = form.getElementsByClassName("DinamizeDivMessageAlert")[0];
                    if(msgAlert) {
                        msgAlert.style.display = "block";
                    }
                }
                imgReq.src = form.getAttribute("action") + "/?" + this.serialize(form) + "&a=" + Math.floor((Math.random()*99999)+1);
                form.appendChild(imgReq);
            }
        },
        Request: function(url, params, form){
            var xmlhttp = new XMLHttpRequest();
            xmlhttp.onreadystatechange = function() {
                if (xmlhttp.readyState == XMLHttpRequest.DONE) {   // XMLHttpRequest.DONE == 4
                    if (xmlhttp.status >= 200 && xmlhttp.status <= 299) {
                        parent.location.href = form.elements["redirect-url-pp"].value;
                        dinForms.Spinner(form, false);
                        dinForms.ResetFormValues(form);
                    } else {
                        dinForms.Spinner(form, false);
                        // elemento deprecated
                        var msgErrorDep = form.getElementsByClassName("divMessageError")[0];
                        if(msgErrorDep) {
                            msgErrorDep.style.display = "block";
                        }
                        var msgAlert = form.getElementsByClassName("DinamizeDivMessageAlert")[0];
                        if(msgAlert) {
                            msgAlert.style.display = "block";
                        }
                    }
                }
            };
            if (typeof params === "string" && params !== "") {
                url += "?" + params; // encodeURI(params);
            }
            
            xmlhttp.open("POST", url, true);
            xmlhttp.send();
        },
        Spinner: function(form, show){
            // manter versão por compatibilidade?
            var submitElement = form.getElementsByClassName("dinSubmit")[0];
            var spinnerElement = form.getElementsByClassName("spinner")[0];

            if (show) {
                if (spinnerElement)
                    spinnerElement.style.display = "block";
                
                if (submitElement)
                    submitElement.value = "";

            }else{
                if (spinnerElement)
                    spinnerElement.style.display = "none";

                if (submitElement)
                    submitElement.value = submitElement.getAttribute("original-value");
            }
        },
        GetCookie: function(cname){
            var name = cname + "=";
            var decodedCookie = decodeURIComponent(document.cookie);
            var ca = decodedCookie.split(";");
            for(var i = 0; i <ca.length; i++) {
                var c = ca[i];
                while (c.charAt(0) == " ") {
                    c = c.substring(1);
                }
                if (c.indexOf(name) == 0) {
                    return c.substring(name.length, c.length);
                }
            }
            return "";
        },
        ResetFormValues: function(form){
            // jquery existe?
            if (typeof($) != "undefined"){
                // iCheck existe?
                if ( (typeof($().iCheck) != "undefined") ){
                    $(form).find("input[type=\"checkbox\"]:not(.cssOnly)").iCheck("uncheck");
                }
            }

            var msgSuccess = form.getElementsByClassName("DinamizeDivMessageSuccess")[0];
            if(msgSuccess) {
                msgSuccess.style.display = "block";
            }
            var imgRequest = document.getElementById("DinamizeImgResponse");
            if(imgRequest) {
                imgRequest.remove();
            }
            form.reset();
        },
        LimpaAvisos: function(form){
            var msgSuccess = form.getElementsByClassName("DinamizeDivMessageSuccess")[0];
            if(msgSuccess)
                msgSuccess.style.display = "none";

            var msgAlert = form.getElementsByClassName("DinamizeDivMessageAlert")[0];
            if(msgAlert)
                msgAlert.style.display = "none";

            var msgError = form.getElementsByClassName("DinamizeDivMessageError")[0];
            if(msgError)
                msgError.style.display = "none";

            // elemento deprecated, de landingPage
            var msgErrorDep = form.getElementsByClassName("divMessageError")[0];
            if(msgErrorDep)
                msgErrorDep.style.display = "none";

            var msgCaptcha = form.getElementsByClassName("DinamizeDivCaptchaMessage")[0];
            if(msgCaptcha)
                msgCaptcha.style.display = "none";
        },
        validateEmail: function(email){
            var re = /^([a-zA-Z0-9_.+-])+\@(([a-zA-Z0-9-])+\.)+([a-zA-Z0-9]{2,4})+$/;
            return re.test(email);
        },
        prepareDate: function(date, format){
            var newDate, time;
            format = format.substr(0,10).replace("/","").replace("/","").replace("-","").replace("-","");
            time = date.substr(10,15);

            if(format == "DDMMAAAA"){
                newDate = date[6]+date[7]+date[8]+date[9] +"-"+ date[3]+date[4] +"-"+ date[0]+date[1];
            }else if(format == "MMDDAAAA"){
                newDate = date[6]+date[7]+date[8]+date[9] +"-"+ date[0]+date[1] +"-"+ date[3]+date[4];
            }else if(format == "AAAAMMDD"){
                newDate = date[0]+date[1]+date[2]+date[3] +"-"+ date[5]+date[6] +"-"+ date[8]+date[9];
            }

            return newDate+time;
        },
        existDate: function(date,time){
            if(time){
                if(date.length != 16){
                    return false;
                }
            }else if(!time){
                if(date.length != 10){
                    return false;
                }
                date +=" 00:00";
            }

            var NEWDATE = new Date(date.replace("-","/").replace("-","/"));
            var strNewdate;

            var y = NEWDATE.getFullYear().toString();
            var m = (NEWDATE.getMonth()+1).toString();
            var d  = NEWDATE.getDate().toString();
            var h  = NEWDATE.getHours().toString();
            var min  = NEWDATE.getMinutes().toString();
            strNewdate = y +"-"+ (m[1]?m:"0"+m[0]) +"-"+ (d[1]?d:"0"+d[0]) +" "+ (h[1]?h:"0"+h[0]) + ":" + (min[1]?min:"0"+min[0]);

            if(date != strNewdate){
                return false;
            }

            return true;
        },
        addClass: function( classname, element ) {
            var cn = element.className;
            if( cn.indexOf( classname ) != -1 ) {
                return;
            }
            if( cn != "" ) {
                classname = " "+classname;
            }
            element.className = cn+classname;
        },
        removeClass: function( classname, element ) {
           var cn = element.className;                     
           var rxp = new RegExp( "\\s?\\b"+classname+"\\b", "g" );
           cn = cn.replace( rxp, "" );
           element.className = cn;
        },
        //funcao do google faz o serialize estilo JQuery
        serialize: function(form){if(!form||form.nodeName!=="FORM"){return }var i,j,q=[];for(i=form.elements.length-1;i>=0;i=i-1){if(form.elements[i].name===""){continue}switch(form.elements[i].nodeName){case"INPUT":switch(form.elements[i].type){case"text":case"hidden":case"password":case"button":case"reset":case"submit":q.push(form.elements[i].name+"="+encodeURIComponent(form.elements[i].value));break;case"checkbox":case"radio":if(form.elements[i].checked){q.push(form.elements[i].name+"="+encodeURIComponent(form.elements[i].value))}break;case"file":break}break;case"TEXTAREA":q.push(form.elements[i].name+"="+encodeURIComponent(form.elements[i].value));break;case"SELECT":switch(form.elements[i].type){case"select-one":q.push(form.elements[i].name+"="+encodeURIComponent(form.elements[i].value));break;case"select-multiple":for(j=form.elements[i].options.length-1;j>=0;j=j-1){if(form.elements[i].options[j].selected){q.push(form.elements[i].name+"="+encodeURIComponent(form.elements[i].options[j].value))}}break}break;case"BUTTON":switch(form.elements[i].type){case"reset":case"submit":case"button":q.push(form.elements[i].name+"="+encodeURIComponent(form.elements[i].value));break}break}}return q.join("&")},
    };
}

//
if ( document.readyState === "complete" ) {
    dinForms.onLoad();
}else {
    if (window.attachEvent) {
        window.attachEvent("load", dinForms.onLoad);
    } else {
        window.addEventListener("load", dinForms.onLoad);
    }
}