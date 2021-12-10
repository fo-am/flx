// Planet Fluxus Copyright (C) 2013 Dave Griffiths
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.
///////////////////////////////////////////////////////////////////////////

// a scheme compiler for javascript

// "Ditto rearranges its cell structure to transform itself into other
// shapes. However, if it tries to transform itself into something by
// relying on its memory, this Pokémon manages to get details wrong."

var ditto = {};

ditto.symbols = [];
ditto.current_define = "";
ditto.function_desc = {};
ditto.current_file = [];

ditto.find_symbol = function(sym) {
    var f=ditto.symbols.indexOf(sym);
    if (f==-1) {
	ditto.symbols.push(sym);
	//return ditto.symbols.length-1;
    }
    //return f;
    return "\""+sym+"\"";
}

ditto.symbol_string = function(id) {
    //return ditto.symbols[id];
    return id;
}

// match up cooresponding bracket to extract sexpr from a string
ditto.extract_sexpr = function(pos, str) {
    var ret="";
    var depth=0;
    var count=0;
    for (var i=pos; i<str.length; i++) {
        if (str[i]==="(") {
            depth++;
        } else {
            if (str[i]===")") {
                depth--;
            }
        }
        ret+=str[i];
        if (depth===0) {
            return ret;
        }
        count++;
    }
    return ret;
};

function white_space(s) {
  return /\s/g.test(s);
}

ditto.parse_tree = function(str) {
    var state="none";
    var in_quotes=false;
    var in_comment=false;
    var current_token="";
    var ret=[];
    var i=1;
    while (i<str.length) {
        switch (state) {
        case "none": {
            // look for a paren start
            if (i>0 && str[i]==="(") {
                var sexpr=ditto.extract_sexpr(i, str);
                ret.push(ditto.parse_tree(sexpr));
                i+=sexpr.length-1;
            } else if (!white_space(str[i]) &&
                       str[i]!=")") {
                state="token";
                if (str[i]===";") {
                    in_comment = true;
                } else {
                    current_token+=str[i];
                    if (str[i]==="\"") in_quotes = true;
                }
            }
        } break;

        case "token": {
            if (in_comment) {
                if (str[i]==="\n") {
                    state="none";
                    in_comment=false;
                }
            }
            else
            {
                if ((in_quotes && str[i]==="\"") ||
                    (!in_quotes &&
                     (str[i]===" " ||
                      str[i]===")" ||
                      str[i]==="\t" ||
                      str[i]==="\n"))) {
                    state="none";
                    if (in_quotes) {
                        //console.log(current_token);
                        ret.push(current_token+"\"");
                    in_quotes=false;
                    } else {
                        if (current_token!="") {
                            if (current_token=="#t") current_token="true";
                            if (current_token=="#f") current_token="false";
                            ret.push(current_token);
                        }
                    }
                    current_token="";
                } else {
                    if (in_quotes) {
                        // escape newlines in quotes

                        if (str[i]=="\n") current_token+=("\\"+str[i]);
                        else current_token+=str[i];
                    } else {
                        switch (str[i]) {
                        case "-":
                            // don't convert - to _ in front of numbers...
                            // (this should be less naive)
                            if (i<str.length-1 &&
                                !ditto.char_is_number(str[i])) {
                                current_token+="_";
                            } else {
                                current_token+=str[i];
                            }
                            break;
                        case "?": current_token+="_q"; break;
                        case "!": current_token+="_e"; break;
                        case ">": current_token+="_to"; break;
                        case "/": current_token+="_slash"; break;
                        default: current_token+=str[i];
                        }
                    }
                }
            }
        } break;
        }
        i++;
    }
    return ret;
};

ditto.car = function(l) { return l[0]; };

ditto.cdr = function(l) {
    if (l.length<2) return [];
    var r=[];
    for (var i=1; i<l.length; i++) {
        r.push(l[i]);
    }
    return r;
};

ditto.cadr = function(l) {
    return ditto.car(ditto.cdr(l));
};

ditto.caddr = function(l) {
    return ditto.car(ditto.cdr(ditto.cdr(l)));
};

ditto.list_map = function(fn, l) {
    var r=[];
    l.forEach(function (i) {
        r.push(fn(i));
    });
    return r;
};

ditto.list_contains = function(l,i) {
    return l.indexOf(i) >= 0;
};

ditto.sublist = function(l,s,e) {
    var r=[];
    if (e==null) e=l.length;
    for (var i=s; i<e; i++) {
        r.push(l[i]);
    }
    return r;
};

ditto.infixify = function(jsfn, args) {
    var cargs = [];
    args.forEach(function(arg) { cargs.push(ditto.comp(arg)); });
    // check for -number
    if (jsfn=="-" && args.length==1) {
	return jsfn+cargs[0];
    } else {
	return "("+cargs.join(" "+jsfn+" ")+")";
    }
};

ditto.check = function(fn,args,min,max) {
    if (args.length<min) {
        ditto.to_page("output", fn+" has too few args ("+args+")");
        return false;
    }
    if (max!=-1 && args.length>max) {
        ditto.to_page("output", fn+" has too many args ("+args+")");
        return false;
    }
    return true;
};

ditto.quote = function(args) {
    if (typeof args == "string") {
	if (ditto.is_number(args)) {
	    return args;
	} else {	
	    return ditto.find_symbol(args); 
	}
    }
    if (typeof args == "object") {
	return "["+ditto.list_map(ditto.quote,args)+"]";
    }
}

// generate code

// ( (arg1 arg2 ...) body ...)
ditto.comp_lambda = function(args) {
    var expr=ditto.cdr(args);
    var nexpr=expr.length;
    var last=expr[nexpr-1];
    var eexpr=ditto.sublist(expr,0,nexpr-1);

    // if not anon
    if (ditto.current_define!="" && ditto.current_define!="_") { 
	//if (ditto.function_desc[ditto.current_define]) {
	//    ditto.to_page("output","function "+ditto.current_define+" ("+ditto.function_desc[ditto.current_define]+") has been redefined as ("+ditto.car(args)+")");
	//}
	// record number of args
	ditto.function_desc[ditto.current_define]=ditto.car(args);
	ditto.current_define="";
    }

    return "function ("+ditto.car(args).join()+")\n"+
        // adding semicolon here
        "{\n"+ditto.list_map(ditto.comp,eexpr).join(";\n")+"\n"+
        "return "+ditto.comp(last)+"\n}\n";
};

ditto.check_defined_args = function(fn,args) {
    if (args && args.length>0) {
	var desc = ditto.function_desc[fn];
	//console.log(args);
	if (desc) {
	    if (args.length!=desc.length) {
		ditto.to_page("output", "call to "+fn+" has wrong number of arguments, given: "+
			      args.length+" ("+args+") expected: "+
			      desc.length+" ("+desc+")");
		
	    }
	}
    }
}

// ( body ... )
// not used... yet
ditto.comp_begin = function(args) {
    var expr=args;
    var nexpr=expr.length;
    var last=expr[nexpr-1];
    var eexpr=ditto.sublist(expr,0,nexpr-1);

    return "function ()\n"+
        // adding semicolon here
        "{\n"+ditto.list_map(ditto.comp,eexpr).join(";\n")+"\n"+
        "return "+ditto.comp(last)+"\n}\n";
}

// ( ((arg1 exp1) (arg2 expr2) ...) body ...)
ditto.comp_let = function(args) {
    var fargs = ditto.car(args);
    largs = [];
    fargs.forEach(function(a) { largs.push(a[0]); });
    return "("+ditto.comp_lambda([largs].concat(ditto.cdr(args)))+"("+
        ditto.list_map(function(a) { return ditto.comp(a[1]); },fargs)+" ))\n";
};

// ( ((pred) body ...)
//   ((pred) body ...)
//   (else body ... ))

ditto.comp_cond = function(args) {
    if (ditto.car(ditto.car(args))==="else") {
        return "(function () { \nreturn "+ditto.comp_let([[]].concat(ditto.cdr(ditto.car(args))))+"})()";
    } else {
        return "(function () { \nif ("+ditto.comp(ditto.car(ditto.car(args)))+") {\n"+
            // todo: decide if lambda, let or begin is canonical way to do this...
            "return "+ditto.comp_let([[]].concat(ditto.cdr(ditto.car(args))))+
            "\n} else {\n"+
            "return "+ditto.comp_cond(ditto.cdr(args))+"\n}})()";
    }
};

ditto.comp_if = function(args) {
    return "(function () { \nif ("+ditto.comp(ditto.car(args))+") {\n"+
        "return "+ditto.comp(ditto.cadr(args))+"\n} else {\n"+
        "return "+ditto.comp(ditto.caddr(args))+"}})()";
};

ditto.comp_when = function(args) {
    return "(function () { \nif ("+ditto.comp(ditto.car(args))+") {\n"+
        "return ("+ditto.comp_lambda([[]].concat(ditto.cdr(args)))+")() }})()";
};

ditto.comp_while = function(args) {
    return "(function () { \nwhile ("+ditto.comp(ditto.car(args))+") {\n"+
        "("+ditto.comp_lambda([[]].concat(ditto.cdr(args)))+")() }})()";
};

ditto.foldl_single_helper = function(fn,val,src) {
    for (var i=0; i<src.length; i++) {
        val=fn(src[i],val);
    }
    return val;
};

ditto.foldl_helper = function(args) {
    var fn=args[0];
    var val=args[1];
    var src=args[2];

    for (var i=0; i<src.length; i++) {
        slice = [];
        for(var j=2; j<args.length; j++) {
            slice.push(args[j][i]);
        }
        slice.push(val);
        val=fn.apply(this,slice);
    }
    return val;
};

ditto.build_list_helper = function(len,fn) {
    var r= Array(len);
    for (var i=0; i<len; i++) {
        r[i]=fn(i);
    }
    return r;
};

ditto.list_replace_helper = function(l,index,val) {
    l[index]=val;
    return l;
};

ditto.core_forms = function(fn, args) {

//    var debug = "// generating: "+fn+"\n";
    var debug = "/* "+fn+" */ ";

    // core forms
    if (fn == "lambda") if (ditto.check(fn,args,2,-1)) return debug+ditto.comp_lambda(args);
    if (fn == "if") if (ditto.check(fn,args,3,3)) return debug+ditto.comp_if(args);
    if (fn == "when") if (ditto.check(fn,args,2,-1)) return debug+ditto.comp_when(args);
    if (fn == "cond") if (ditto.check(fn,args,2,-1)) return debug+ditto.comp_cond(args);
    if (fn == "let") if (ditto.check(fn,args,2,-1)) return debug+ditto.comp_let(args);
    if (fn == "while") if (ditto.check(fn,args,2,-1)) return debug+ditto.comp_while(args);
    if (fn == "quote") if (ditto.check(fn,args,1,-1)) return debug+ditto.quote(ditto.car(args));

    if (fn == "define") {
        // adding semicolon here
        if (ditto.check(fn,args,2,-1)) {
	    ditto.current_define=ditto.car(args);
	    var ret=debug+"var "+ditto.car(args)+" = "+ditto.comp(ditto.cadr(args))+";";
	    ditto.current_define="";
	    return ret;
	}
    }

    if (fn == "list") {
        return debug+"["+ditto.list_map(ditto.comp,args).join(",")+"]";
    }

    if (fn == "begin") {
        return debug+"("+ditto.comp_lambda([[]].concat(args))+")()";
    }

    if (fn == "list_ref") {
        if (ditto.check(fn,args,2,2)) return debug+ditto.comp(ditto.car(args))+"["+ditto.comp(ditto.cadr(args))+"]";
    }

    if (fn == "list_replace") {
        if (ditto.check(fn,args,3,3))
            return "ditto.list_replace_helper("+
            ditto.comp(ditto.car(args))+","+
            ditto.comp(ditto.cadr(args))+","+
            ditto.comp(ditto.caddr(args))+")";
    }

    // iterative build-list version for optimisation
    if (fn == "build_list") {
        if (ditto.check(fn,args,2,2))
            return "ditto.build_list_helper("+
            ditto.comp(ditto.car(args))+","+
            ditto.comp(ditto.cadr(args))+")";
    }

    // todo - make general for multiple lists as input
    // iterative fold version for optimisation
    if (fn == "foldl") {
        if (args.length==3)
            return "ditto.foldl_single_helper("+
            ditto.comp(ditto.car(args))+","+
            ditto.comp(ditto.cadr(args))+","+
            ditto.comp(ditto.caddr(args))+")";
        else
            return "ditto.foldl_helper(["+ditto.list_map(ditto.comp,args).join(",")+"])";
    }

    // iterative fold version for optimisation
    if (fn == "list_contains_q") {
        return "ditto.list_contains("+
        ditto.comp(ditto.car(args))+","+
        ditto.comp(ditto.cadr(args))+")";
    }
    
    if (fn == "list_q") {
        if (ditto.check(fn,args,1,1))
            return debug+"(Object.prototype.toString.call("+
            ditto.comp(ditto.car(args))+") === '[object Array]')";
    }

    if (fn == "number_q") {
        if (ditto.check(fn,args,1,1))
            return debug+"(typeof "+ditto.comp(ditto.car(args))+" === 'number')";
    }

    if (fn == "boolean_q") {
        if (ditto.check(fn,args,1,1))
            return debug+"(typeof "+ditto.comp(ditto.car(args))+" === 'boolean')";
    }

    if (fn == "string_q") {
        if (ditto.check(fn,args,1,1))
            return debug+"(typeof "+ditto.comp(ditto.car(args))+" === 'string')";
    }

    if (fn == "length") {
        if (ditto.check(fn,args,1,1)) return debug+ditto.comp(ditto.car(args))+".length";
    }

    if (fn == "null_q") {
        if (ditto.check(fn,args,1,1)) return debug+"("+ditto.comp(ditto.car(args))+".length==0)";
    }

    if (fn == "not") {
        if (ditto.check(fn,args,1,1))
            return debug+"!("+ditto.comp(ditto.car(args))+")";
    }

    if (fn == "cons") {
        if (ditto.check(fn,args,2,2))
            return debug+"["+ditto.comp(ditto.car(args))+"].concat("+ditto.comp(ditto.cadr(args))+")";
    }

    if (fn == "append") {
        if (ditto.check(fn,args,1,-1)) {
            var r=ditto.comp(ditto.car(args));
            for (var i=1; i<args.length; i++) {
                r+=".concat("+ditto.comp(args[i])+")";
            }
            return debug+r;
        }
    }

    if (fn == "car") {
        if (ditto.check(fn,args,1,1))
            return debug+ditto.comp(ditto.car(args))+"[0]";
    }

    if (fn == "cadr") {
        if (ditto.check(fn,args,1,1))
            return debug+ditto.comp(ditto.car(args))+"[1]";
    }

    if (fn == "caddr") {
        if (ditto.check(fn,args,1,1))
            return debug+ditto.comp(ditto.car(args))+"[2]";
    }

    if (fn == "cdr") {
        if (ditto.check(fn,args,1,1))
            return debug+"ditto.sublist("+ditto.comp(ditto.car(args))+",1)";
    }

    if (fn == "eq_q") {
        if (ditto.check(fn,args,2,2))
            return debug+ditto.comp(ditto.car(args))+"=="+
            ditto.comp(ditto.cadr(args));
    }


    var infix = [["+","+"],
                 ["string_append", "+"],
                 ["-","-"],
                 ["*","*"],
                 ["/","/"],
                 ["%","%"],
                 ["<","<"],
                 [">",">"],
                 ["<=","<="],
                 [">=",">="],
                 ["=","=="],
                 ["and","&&"],
                 ["or","||"],
				 ["bitwise_and","&"],
				 ["bitwise_or","|"],
				 ["bitwise_not","^"],
				 ["bitwise_lshift","<<"],
				 ["bitwise_rshift",">>"]];
	
    for (var i=0; i<infix.length; i++) {
        if (fn == infix[i][0]) return debug+ditto.infixify(infix[i][1],args);
    }

    if (fn == "set_e") {
        if (ditto.check(fn,args,2,2))
            return debug+ditto.comp(ditto.car(args))+"="+ditto.comp(ditto.cadr(args));
    }

    if (fn == "try") {
        if (ditto.check(fn,args,2,2))
            return debug+"try {"+ditto.comp(ditto.car(args))+"} catch (e) { "+ditto.comp(ditto.cadr(args))+" }";
    }

    // heart of darkness
    if (fn == "eval_string") {
        if (ditto.check(fn,args,1,1))
            return debug+"eval(ditto.comp(ditto.parse_tree("+ditto.comp(ditto.car(args))+")))";
    }

    // js intrinsics
    if (fn == "js") {
        if (ditto.check(fn,args,1,1)) {
            var v=ditto.car(args);
            // remove the quotes to insert the literal string
            return debug+v.substring(1,v.length-1);
        }
    }

    if (fn == "new") {
        return debug+"new "+ditto.car(args)+"( "+ditto.comp(ditto.cadr(args))+")";
    }

    if (fn == "load") {
        var v=ditto.comp(ditto.car(args));
        return ditto.load(v.substring(1,v.length-1));
    }

    return false;
};

ditto.char_is_number = function(c) {
    switch (c) {
        case "0": return true; break;
        case "1": return true; break;
        case "2": return true; break;
        case "3": return true; break;
        case "4": return true; break;
        case "5": return true; break;
        case "6": return true; break;
        case "7": return true; break;
        case "8": return true; break;
        case "9": return true; break;
    }
    return false;
};

ditto.is_number = function(str) {
    return ditto.char_is_number(str[0]);
};

ditto.comp = function(f) {
    //    console.log(f);
    try {
        // string, number or list?
        if (typeof f == "string") {
	    if (f[0] == "'") {
		// the empty list
		if (f=="'(") return "[]";

		// we have a symbol
		return ditto.find_symbol(f.substring(1,f.length));
	    }
	    return f;
	}
	
        // if null list
        if (f.length==0) return "[]";

        // apply args to function
        if (typeof ditto.car(f) == "string") {
            // if it's a number
            if (ditto.is_number(ditto.car(f))) return ditto.car(f);
            if (ditto.car(f)[0]=="\"") return ditto.car(f);

            var fn=ditto.car(f);
            var args=ditto.cdr(f);

            // look for a core form
            var r = ditto.core_forms(fn,args);
            if (r) return r;

	    // check args
	    ditto.check_defined_args(fn,args);
	    
            // fallthrough to outer javascript environment
            return fn+"("+ditto.list_map(ditto.comp,args).join()+")";
        } else {
            // plain list
            return ditto.list_map(ditto.comp,f).join("\n");
        }
    } catch (e) {
        ditto.to_page("output", "An error in parsing occured on "+f.toString());
        ditto.to_page("output", e);
        ditto.to_page("output", e.stack);
        return "";
    }
};

ditto.compile_code = function(scheme_code) {
    var parse_tree=ditto.parse_tree("("+scheme_code+")");
    //console.log(JSON.stringify(do_syntax(parse_tree)));
    return ditto.comp(do_syntax(parse_tree));
};


ditto.compile_code_unparsed = function(scheme_code) {
    var parse_tree=ditto.parse_tree("("+scheme_code+")");
    return ditto.comp(parse_tree);
};

////////////////////////////////////////////////////
// resource loading

ditto.load_resource_static = false;

// resource file map of filenames to data, ascii or base64 encoded binary
ditto.resources = {}

function init_resources(resources) {
    ditto.load_resource_static = true;
    ditto.resources = resources;
}

// single point of entry for all loading
function load_resource_txt(url, loadedfn) {
    if (ditto.load_resource_static) {
	var ret = ditto.resources[url];
	if (ret==undefined) {
	    ditto.to_page("output","error loading statically: "+url+" has not been embedded");
	} else {
	    loadedfn(ret);
	}
    } else {
	var xmlHttp = new XMLHttpRequest();
	xmlHttp.open("GET", url, true);
	xmlHttp.onload = function() {
	    loadedfn(xmlHttp.responseText);
	};
	xmlHttp.overrideMimeType("script");
	xmlHttp.send(null);
    }
}

ditto.load_resource_txt_badly = function(url) {
    if (ditto.load_resource_static) {
	var ret = ditto.resources[url];
	if (ret==undefined) {
	    ditto.to_page("output","error loading statically: "+url+" has not been embedded");
	} else {
	    return ret;
	}
    } else {
	var xmlHttp = new XMLHttpRequest();
	xmlHttp.open("GET", url, false);
	xmlHttp.overrideMimeType("script");
	xmlHttp.send(null);
	return xmlHttp.responseText;
    }
}

function load_resource_img(url, loadedfn) {
    if (ditto.load_resource_static) {
	var ret = ditto.resources[url];
	if (ret==undefined) {
	    ditto.to_page("output","error loading statically: "+url+" has not been embedded");
	} else {
	    var image = new Image();
	    image.src="data:image/png;base64,"+ret;
	    // still need to wait to process data url
	    image.onload = function() {
		loadedfn(image);
	    }
	}
    } else {
	var image = new Image();
	image.onload = function() {
	    loadedfn(image);
	};
	image.src = url;
    }
}

/////////////////////////////////////////////////////////
// loading code - todo: make these asyncronous

ditto.load = function(url) {
    ditto.current_file.push(url);
    var str=ditto.load_resource_txt_badly(url);
    var ret= "\n/////////////////// "+url+"\n"+ditto.compile_code(str)+"\n";
    ditto.current_file.pop();
    return ret;
};

ditto.load_unparsed = function(url) {
    var str=ditto.load_resource_txt_badly(url);
    return "\n/////////////////// "+url+"\n"+ditto.compile_code_unparsed(str)+"\n";
};

ditto.get_current_file = function() {
    if (ditto.current_file.length==0) {
	return "no file";
    } else {
	return ditto.current_file[ditto.current_file.length-1];
    }
}

ditto.to_page = function(id,html)
{
/*    var div=document.createElement("div");
    div.id = "foo";
    div.innerHTML = html;
    document.getElementById(id).appendChild(div);*/
    console.log("ditto says: ("+ditto.get_current_file()+") "+html);
};

// this needs to go somewhere else
function shuffle(array) {
  var currentIndex = array.length, temporaryValue, randomIndex;
  var new_array = new Array(array.length);
  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    new_array[currentIndex] = array[randomIndex];
    new_array[randomIndex] = array[currentIndex];
  }

  return new_array;
}


function ditto_init(filenames) {
    // load and compile the syntax parser
    var syntax_parse=ditto.load_unparsed("flx/scm/syntax.jscm");
    try {
        //console.log(syntax_parse);
        do_syntax=eval(syntax_parse);
    } catch (e) {
        console.log("An error occured parsing (syntax) of "+syntax_parse);
        console.log(e);
        console.log(e.stack);
    }

    var js=ditto.load("flx/scm/base.jscm");

    filenames.forEach(function(filename) {
        //console.log("loading "+filename);
        js+=ditto.load(filename);
    });

    try {
        //eval(js);
        setTimeout(js,0);
	//console.log(js);
    } catch (e) {
	//console.log(js);
        console.log(e);
        console.log(e.stack);
        ditto.to_page("output", "Error: "+e);	
        ditto.to_page("output", "Error: "+e.stack);	
    }
};

function init_static(syntax,source) {
    jQuery(document).ready(function($) {

        // load and compile the syntax parser
        var syntax_parse=ditto.compile_code_unparsed(syntax);
        try {
            //console.log(syntax_parse);
            do_syntax=eval(syntax_parse);
        } catch (e) {
            console.log("An error occured parsing (syntax) of "+syntax_parse);
            console.log(e);
            console.log(e.stack);
        }

        var js=ditto.compile_code(source);

        try {
            //eval(js);
            setTimeout(js,0);
	    //console.log(js);
        } catch (e) {
	    //console.log(js);
            console.log(e);
            console.log(e.stack);
            ditto.to_page("output", "Error: "+e);	
            ditto.to_page("output", "Error: "+e.stack);	
        }
    });
};

function scheme_eval(filenames,code) {
    // load and compile the syntax parser
    var syntax_parse=ditto.load_unparsed("flx/scm/syntax.jscm");
    try {
        //console.log(syntax_parse);
        do_syntax=eval(syntax_parse);
    } catch (e) {
        console.log("An error occured parsing (syntax) of "+syntax_parse);
        console.log(e);
        console.log(e.stack);
        ditto.to_page("output", "An error occured parsing (syntax) of "+e);	
        ditto.to_page("output", "Stack: "+e.stack);	
    }

    var js="try { cancelAnimationFrame(crank);\n";

    js+=ditto.load("flx/scm/base.jscm");

    filenames.forEach(function(filename) {
        //console.log("loading "+filename);
        js+=ditto.load(filename);
    });

    js+="\n"+ditto.compile_code(code)+"\n";

    js+="    } catch (e) {\
        console.log(e);\
        console.log(e.stack);\
        ditto.to_page('output', 'Error: '+e);	\
        ditto.to_page('output', 'Error: '+e.stack);	\
        }";
    
    setTimeout(js,0);
};


function simple_eval(code) {
    // load and compile the syntax parser
    var js="try { cancelAnimationFrame(crank);\n";

    canvas.removeEventListener("mousedown", mousedown_handler)
    canvas.removeEventListener("touchstart", touchstart_handler)
    canvas.removeEventListener("mousemove", mousemove_handler)
    canvas.removeEventListener("touchmove", touchmove_handler)      
    canvas.removeEventListener("mouseup", mouseup_handler)
    canvas.removeEventListener("DOMMouseScroll", canvas_zoom)
    canvas.removeEventListener("mousewheel", canvas_zoom)

    js+="\n"+ditto.compile_code(code)+"\n";

    js+="    } catch (e) {\
        console.log(e);\
        console.log(e.stack);\
        ditto.to_page('output', 'Error: '+e);	\
        ditto.to_page('output', 'Error: '+e.stack);	\
        }";
    
    setTimeout(js,0);
};

function ditto_run(filenames) {
    // load and compile the syntax parser
    var syntax_parse=ditto.load_unparsed("flx/scm/syntax.jscm");
    try {
        //console.log(syntax_parse);
        do_syntax=eval(syntax_parse);
    } catch (e) {
        console.log("An error occured parsing (syntax) of "+syntax_parse);
        console.log(e);
        console.log(e.stack);
    }

    var js=ditto.load("flx/scm/base.jscm");
    
    filenames.forEach(function(filename) {
        //console.log("loading "+filename);
        js+=ditto.load(filename);
    });
    
    try {
        //eval(js);
        setTimeout(js,0);
	//console.log(js);
    } catch (e) {
	//console.log(js);
        console.log(e);
        console.log(e.stack);
        ditto.to_page("output", "Error: "+e);	
        ditto.to_page("output", "Error: "+e.stack);	
    }    
};
