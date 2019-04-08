function AxisLabelX(el, x, y, text) {
    var label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    //var label = document.createElement("text");
    //label.setAttribute("x", x);
    label.setAttribute("y", y);
    label.textContent = text;
    el.appendChild(label);
    this.el = label;
    this.state = 10;
    label.className.baseVal = "label-off";
    setTimeout(function () {
        label.className.baseVal = "label-on ";
    }, 0);

    this.setX = function (x) {
        if (label.getAttribute("x") != x)
            label.setAttribute("x", x);
    };
    this.setY = function (y) {
        if (label.getAttribute("y") != y)
            label.setAttribute("y", y);
    };
    this.update = function () {
        if (this.state === -10) {
            label.className.baseVal = "label-on ";
        }
        this.state = 10;
        if (this.timeoutid) {
            clearTimeout(this.timeoutid);
            this.timeoutid = null;
        }
    };
    this.remove = function (cb) {
        if (this.state === -10)
            return;
        label.className.baseVal = "label-off";
        this.state = -10;
        this.timeoutid = setTimeout(function () {
            el.removeChild(label);
            cb();
        }, 2000);
    };
}

function AxisLabelY(g_label, g_line, x, y, text) {
    var fontsize=parseFloat(getComputedStyle(g_label).fontSize);
    var label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", x + fontsize/2);
    label.setAttribute("y", y - fontsize/2);
    label.textContent = text;
    g_label.appendChild(label);
    this.el = label;
    this.state = 10;
    label.className.baseVal = "label-off";

    var self = this;
    var line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", 0);
    line.setAttribute("x2", "100%");
    g_line.appendChild(line);

    line.className.baseVal = "label-off";
    setTimeout(function () {
        label.className.baseVal = "label-on ";
        line.className.baseVal = "label-on ";
    }, 0);


    this.setY = function (y) {
        if (label.getAttribute("y") != y - fontsize/2)
            label.setAttribute("y", y - fontsize/2);
        if (line.getAttribute("y1") != y)
            line.setAttribute("y1", y);
        if (line.getAttribute("y2") != y)
            line.setAttribute("y2", y);
    };
    this.update = function () {
        if (this.state === -10) {
            label.className.baseVal = "label-on ";
            line.className.baseVal = "label-on ";
        }
        self.state = 10;
        if (self.timeoutid) {
            clearTimeout(this.timeoutid);
            self.timeoutid = null;
        }
    };
    this.remove = function (cb) {
        if (self.state === -10)
            return;
        label.className.baseVal = "label-off";
        line.className.baseVal = "label-off";
        self.state = -10;
        self.timeoutid = setTimeout(function () {
            g_label.removeChild(label);
            g_line.removeChild(line);
            cb();
        }, 2000);
    };
}

function toDateStr(dat,withDay) {
    var monthNames = [
        "Jan", "Feb", "Mar",
        "Apr", "May", "Jun", "Jul",
        "Aug", "Sep", "Oct",
        "Nov", "Dec"
    ];
    var days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']; 
    var d = new Date(dat);
    var day = d.getDate();
    var monthid = d.getMonth();
    return (withDay?days[d.getDay()]+", ":"")+monthNames[monthid] + ' ' + day;
}

function XScale(parent, axis, transf, tickcnt) {
    this.labels = new Map();

    var g_label = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g_label.className.baseVal = "labels x-labels";
    parent.appendChild(g_label);

    var d1 = 1000 * 3600 * 24;
    var y, h;

    this.update = function () {
        var low = axis.low, high = axis.high;
        //this.low = low;
        //this.high = high;
        var fontsize=parseFloat(getComputedStyle(g_label).fontSize);
        var range = high - low;
        if (this.range !== range) {
            this.range = range;
            //scale = transf.box.w / range
            this.step = Math.pow(2, Math.round(Math.log2(range / d1 / tickcnt))) * d1;
        }
        var step = this.step;
        var offset = axis.origin % step;
        var labels = this.labels;
        if (y !== transf.box.y || h !== transf.box.h)
            labels.forEach(function (v, k) {
                v.setY(transf.box.y + transf.box.h + fontsize+fontsize/2);
            });
        y = transf.box.y;
        h = transf.box.h;
        labels.forEach(function (v, k) {
            if (v.state > 0)
                v.state = 0;
        });
        for (var tick = Math.floor(low / step) * step + offset; tick < high; tick += step) {
            if (labels.has(tick))
                labels.get(tick).update();
            else
                labels.set(tick, new AxisLabelX(g_label, 0, transf.box.y + transf.box.h + fontsize+fontsize/2, toDateStr(tick)));
        }
        labels.forEach(function (v, k) {
            v.setX(transf.toView(k, "x"));
            if (k < low || k > high || v.state === 0) {
                v.remove(function () {
                    labels.delete(k);
                });
            }
        });
    };
}

function YScale(parent, axis, transf, tickcnt) {
    var self = this;
    this.labels = new Map();

    var g_label = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g_label.className.baseVal = "labels y-labels";
    parent.appendChild(g_label);

    var g_line = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g_line.className.baseVal = "grid y-grid";
    parent.appendChild(g_line);

    this.update = function () {
        var low = axis.low, high = axis.high;
        self.low = low;
        self.high = high;
        var range = high - low;
        var fontsize=parseFloat(getComputedStyle(g_label).fontSize);
        var tickcnt=Math.max(transf.box.h/(4*fontsize),3);
        if (self.range !== range || self.tickcnt!==tickcnt) {
            self.range = range;
            self.tickcnt= tickcnt;
            //scale = transf.box.h / range
            if (range > 10 * tickcnt){
                this.step = Math.pow(10, Math.ceil(Math.log10(range / tickcnt)));
                if(range/this.step<1*tickcnt/5) 
                    this.step=this.step/5;
                else if(range/this.step<3*tickcnt/5) 
                    this.step=this.step/2;
            }
            else if (range > 5 * tickcnt)
                self.step = 5 * Math.ceil(range / tickcnt / 5);
            else
                self.step = Math.ceil(range / tickcnt);

        }
        var step = self.step;
        var offset = axis.origin % step;
        var labels = self.labels;

        labels.forEach(function (v, k) {
            if (v.state > 0)
                v.state = 0;
        });
        for (var tick = Math.floor(low / step) * step + offset; tick < high; tick += step) {
            if (labels.has(tick))
                labels.get(tick).update();
            else
                labels.set(tick, new AxisLabelY(g_label, g_line, transf.box.x, 0, tick));
        }
        labels.forEach(function (v, k) {
            v.setY(transf.toView(k, "y"));
            if (k < low || k > high || v.state === 0) {
                v.remove(function () {
                    labels.delete(k);
                });
            }
        });
    };
}

function throttle(func, limit) {
    var lastFunc;
    var lastRan;
    return function () {
        var context = this;
        var args = arguments;
        if (!lastRan) {
            func.apply(context, args);
            lastRan = Date.now();
        } else {
            clearTimeout(lastFunc);
            lastFunc = setTimeout(function () {
                if ((Date.now() - lastRan) >= limit) {
                    func.apply(context, args);
                    lastRan = Date.now();
                }
            }, limit - (Date.now() - lastRan));
        }
    };
}

function getMousePosition(evt, el) {
    var CTM = el.getScreenCTM();
    if (evt.touches) { evt = evt.touches[0]; }
    return {
        x: (evt.clientX - CTM.e) / CTM.a,
        y: (evt.clientY - CTM.f) / CTM.d
    };
}

function Navigator(parent, range, transf, g_el) {
    Animatable.call(this);

    var svg = document.createElementNS("http://www.w3.org/2000/svg", "g");
    svg.className.baseVal = "nav";

    this.el = svg;
    var rects = {
        l: document.createElementNS("http://www.w3.org/2000/svg", "rect"),
        bl: document.createElementNS("http://www.w3.org/2000/svg", "rect"),
        p: document.createElementNS("http://www.w3.org/2000/svg", "rect"),
        br: document.createElementNS("http://www.w3.org/2000/svg", "rect"),
        r: document.createElementNS("http://www.w3.org/2000/svg", "rect")
    };

    for (var rt in rects) {
        rects[rt].setAttribute("id", r);
        if (rt === 'r' || rt === 'l') {
            rects[rt].className.baseVal = "nav-cover draggable";
            continue;
        }
        else if (rt === "p"){
            rects[rt].className.baseVal = "nav-pos draggable";
            continue;
        }
        else
            rects[rt].className.baseVal = "nav-brd draggable";

        svg.appendChild(rects[rt]);
    }

    svg.appendChild(g_el);

    svg.appendChild(rects.p);
    svg.appendChild(rects.l);
    svg.appendChild(rects.r);

    var selectedElement, offset, transform;
    var startDrag = function(evt) {
        if (evt.target.classList.contains('draggable')) {
            selectedElement = evt.target;
            //console.log(evt.type)
        } else
            return;
        offset = getMousePosition(evt, svg);
        offset.x -= parseFloat(selectedElement.getAttribute("x"));
        offset.y -= parseFloat(selectedElement.getAttribute("y"));
    };

    var self = this;
    this.boundWeigth = 10;
    var prev_x;

    function setRange(e) {
        //console.log(e.type)
        var coord = getMousePosition(e, svg);
        var x = coord.x - offset.x;
        /*if (Math.abs(prev_x - x) < 1)
            return;*/
        prev_x = x;
        if (coord.x < transf.box.x || (coord.x + self.boundWeigth) > (transf.box.x + transf.box.w))
            return;

        var val = 0;
        if (selectedElement == rects.bl || selectedElement == rects.l) {
            val = transf.toUnit(coord.x);
            range.setRange(val, range.high);
        }
        else if (selectedElement == rects.p) {
            val = transf.toUnit(x - self.boundWeigth);
            range.setRange(val, val + range.high - range.low);
        }
        else if (selectedElement == rects.br|| selectedElement == rects.r) {
            val = transf.toUnit(coord.x + self.boundWeigth);
            range.setRange(range.low, val);
        }
    }

    var setRangeThrottle = throttle(setRange, 50);
    function drag(e) {
        //console.log(e.type)
        if (selectedElement) {
            e.preventDefault();
            setRangeThrottle(e);
        }
    }

    function endDrag(e) {
        selectedElement = false;
        //console.log(e.type)
    }

    parent.appendChild(svg);

    svg.addEventListener('mousedown', startDrag);
    svg.addEventListener('mousemove', drag);
    svg.addEventListener('mouseup', endDrag);
    svg.addEventListener('mouseleave', endDrag);
    svg.addEventListener('touchstart', startDrag, false);
    parent.addEventListener('touchmove', drag, true);
    //svg.addEventListener('touchmove', drag, true);
    //rects.p.addEventListener('touchmove', drag);
    svg.addEventListener('touchend', endDrag, false);
    //svg.addEventListener('touchleave', endDrag,false);
    svg.addEventListener('touchcancel', endDrag, false);

    /*
        parent.addEventListener('pointerdown', startDrag);
        parent.addEventListener('pointermove', drag);
        parent.addEventListener('pointerup', endDrag);
        parent.addEventListener('pointerleave', endDrag);
        //svg.addEventListener('pointercancel', endDrag);
    */

    function render(l, r) {
        var rect;
        if (rects.l.getAttribute("x") != transf.box.x)
            rects.l.setAttribute("x", transf.box.x);
        if (rects.l.getAttribute("y") != transf.box.y)
            for (rect in rects) {
                rects[rect].setAttribute("y", transf.box.y);
                rects[rect].setAttribute("height", transf.box.h);
            }
        if (rects.l.getAttribute("height") != transf.box.h)
            for (rect in rects)
                rects[rect].setAttribute("height", transf.box.h);

        if (rects.bl.getAttribute("x") != l) {
            rects.l.setAttribute("width", Math.max(l,0));
            rects.bl.setAttribute("x", l);
            rects.p.setAttribute("x", l + self.boundWeigth);
        }
        if (rects.bl.getAttribute("width") != self.boundWeigth) {
            rects.bl.setAttribute("width", self.boundWeigth);
            rects.br.setAttribute("width", self.boundWeigth);
        }
        var pw = Math.max(r - l - 2 * self.boundWeigth,1);
        if (rects.p.getAttribute("width") != pw)
            rects.p.setAttribute("width", pw);
        if (rects.r.getAttribute("x") != r) {
            rects.br.setAttribute("x", r - self.boundWeigth);
            rects.r.setAttribute("x", r);
        }
        if (rects.r.getAttribute("width") != Math.max(transf.box.w - r, 0))
            rects.r.setAttribute("width", Math.max(transf.box.w - r, 0));
    }

    function move(from, to) {
        return function (progress) {
            self.cur = {
                l: getCurvalue(from.l, to.l, progress),
                r: getCurvalue(from.r, to.r, progress),
            };
            render(l,r);
        };
    }

    var to_l, to_r, from_l, from_r ,l, r;

    this.update = function () {
        to_l=transf.toView(range.low, "x");
        to_r=transf.toView(range.high, "x");
        if(typeof l==="undefined"||typeof r==="undefined"){
            l=to_l;
            r=to_r;
            render(l,r);
            return;
        }
        from_l=l;
        from_r=r;
        self.animate(function (progress) {
            l=getCurvalue(from_l, to_l, progress);
            r=getCurvalue(from_r, to_r, progress);
            render(l,r);
        }, 30);
        //render(transf.toView(range.low, "x"), transf.toView(range.high, "x"));
    };
}

function GraphLine(parent, coord, transf, opt) {
    var self = this;
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "g");
    svg.className.baseVal = "graphline";
    this.el = svg;
    if (parent)
        parent.appendChild(svg);

    function makePointStr(xa, ya) {
        var str = "";
        if (!ya)
            return "";
        for (var i = 0; i < xa.length; i++)
            str += xa[i] + ',' + ya[i] + ' ';
        return str;
    }

    function transform_arr(va, d) {
        var res = [];
        for (var i = 0; i < va.length; i++)
            res.push(transf.toView(va[i], d));
        return res;
    }

    this.lines = new Map();
    this.update = function () {
        var gi = 0;
        for (var i = 0; i < coord.graph.length; i++) {
            var x = coord.graph[i];
            var xa = transform_arr(x.data, "x");
            for (var j = 0; j < x.child.length; j++) {
                var y = x.child[j];
                var line;
                if (!self.lines.has(y.id)) {
                    line = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
                    //line.setAttribute("fill", "none")
                    line.setAttribute("stroke", y.color);
                    if(opt&&opt.strokeWidth)
                        line.setAttribute("stroke-width",opt.strokeWidth);
                    svg.appendChild(line);
                    self.lines.set(y.id, line);
                } else
                    line = self.lines.get(y.id);
                var ya = transform_arr(y.data, "y");
                line.setAttribute("points", makePointStr(xa, ya));
                if(y.disable){
                    if(line.className.baseVal!=="label-off")
                        line.className.baseVal = "label-off";
                }
                else 
                    if(line.className.baseVal!=="label-on")line.className.baseVal = "label-on";
            }
        }
    };
}

function PointInfo(parent, coord, transf) {
    var self = this;
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "g");
    svg.className.baseVal = "grid";

    var line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.className.baseVal = "pi-line";
    svg.appendChild(line);

    var legend = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
    if(legend.className)
        legend.className.baseVal = "pointinfo";
    legend.setAttribute("x", 0);
    legend.setAttribute("y", 0);
    legend.setAttribute("width", 0);
    legend.setAttribute("height", 500);
    //legend.innerHTML='sdfsfsdf'
    var el_date = document.createElementNS("http://www.w3.org/1999/xhtml","div");
    el_date.className = "pi-date" ;
    var el_values = document.createElementNS("http://www.w3.org/1999/xhtml","div");
    el_values.className = "pi-values";
    var el_box = document.createElementNS("http://www.w3.org/1999/xhtml","div");
    el_box.className = "pi-box";
    el_box.appendChild(el_date);
    el_box.appendChild(el_values);
    legend.appendChild(el_box);
    svg.appendChild(legend);

    function createCircle(graph) {
        var el = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        el.setAttribute("r", 5);
        el.setAttribute("fill", "none");
        el.setAttribute("stroke", graph.color);
        el.setAttribute("stroke-width", 3);
        svg.appendChild(el);
        return el;
    }

    function createInfo(graph) {
        var el = document.createElement("div");
        el.className = "pi-val-block";
        el.style.color = graph.color;
        var name = document.createElement("div");
        name.textContent=graph.name;
        var val = document.createElement("div");
        val.className = "pi-val";
        el.appendChild(val);
        el.appendChild(name);
        el_values.appendChild(el);
        return val;
    }

    var v;
    var circle = {};
    var values = {};

    this.setCapture=function(el){
        var pointThrottle = throttle(point, 50);
        function point(e) {
            var pos = getMousePosition(e, el);
            v = transf.toUnit(pos.x);
            self.update();
        }
        el.addEventListener('mousedown', pointThrottle);
        //parent.addEventListener('touchstart', pointThrottle,false);
        el.addEventListener('touchstart', pointThrottle);
        //svg.addEventListener('touchstart', pointThrottle,false);
        el.addEventListener('touchmove', pointThrottle);
        //el.addEventListener('touchend', pointThrottle);
    };

    this.update = function () {
        if (!v)
            return;
        if (line.getAttribute("y1") != transf.box.y) 
            line.setAttribute("y1", transf.box.y);
        if (line.getAttribute("y2") != transf.box.h) 
            line.setAttribute("y2", transf.box.h);

        var idx = searchIdx(coord.graph[0].data, v, 2);
        if (idx) {
            var x=coord.graph[0].data[idx];
            vx = transf.toView(x, "x");
            el_date.textContent=toDateStr(x,true);
            var ya = coord.graph[0].child;
            for (var i = 0; i < ya.length; i++) {
                var id = ya[i].id;
                var el;
                if (circle[id])
                    el = circle[id];
                else
                    el = circle[id] = createCircle(ya[i]);

                var vy = transf.toView(ya[i].data[idx], "y");
                if (vx<transf.box.x && legend.style)
                    legend.style.visibility="hidden";
                else if (legend.style)
                    legend.style.visibility="";
                if(typeof vx!= "undefined" && vx>=0 && typeof vy!="undefined" && vy>=0){
                    el.setAttribute("cx", vx);
                    el.setAttribute("cy", vy);
                    line.setAttribute("x1", vx);
                    line.setAttribute("x2", vx);
                } else {
                    el.setAttribute("cx", -10);
                    line.setAttribute("x1", -10);
                    line.setAttribute("x2", -10);
                }

                var val;
                if (values[id])
                    val = values[id];
                else
                    val = values[id] = createInfo(ya[i]);

                legend.setAttribute("x",vx);
                var bBox = el_box.getBoundingClientRect();
                if(legend.getAttribute("width")!=bBox.width)
                    legend.setAttribute("width", bBox.width+20);
                val.textContent=ya[i].data[idx];

                if(ya[i].disable){
                    val.parentElement.style.display="none";
                    el.style.display="none";
                } else {
                    val.parentElement.style.display="";
                    el.style.display="";           
                }
            }
        }
    };
    parent.appendChild(svg);
}

function GraphButtons(parent, coord){
    var div = document.createElement("div");
    
    var buttons={};
    function createButton(graph){

        var span_in=document.createElement("span");
        span_in.style.color=graph.color;
        span_in.className="span-input";
        var check_svg_check="M 12,0a 11 11 0 1 0 1 0zM10,17l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z";
        var check_svg_uncheck="M 12,0a 11 11 0 1 0 1 0zm 1,2a 9 9 0 1 1 -1 0Z";
        span_in.innerHTML='<svg class="chx-svg" focusable="false" viewBox="0 0 24 24" aria-hidden="true" role="presentation"><path d="'+check_svg_check+'"></path></svg><input id="'+graph.id+'" type="checkbox" class="chx-input" checked="">';
        var t=span_in.getElementsByTagName('input');
        var input=span_in.getElementsByTagName('input')[0];
        var path=span_in.getElementsByTagName('path')[0];

        input.addEventListener('change', function (event) {
            if (event.target.checked){
                graph.disable=false;
                path.setAttribute("d",check_svg_check);
            }
            else {
                graph.disable=true;
                path.setAttribute("d",check_svg_uncheck);
            }
            coord.update();
          });
        var label=document.createElement("label");
        label.className="graph-button";
        label.textContent=graph.name;
        
        /*var span=document.createElement("span");
        span.className="chx-lbl";
        span.textContent=graph.name;*/

        label.appendChild(span_in/*input*/);
        //label.appendChild(span);
        div.appendChild(label);
        return div;
    }
    parent.appendChild(div);

    this.update=function(){
        if(coord.graph.length===0)
            return;
        var ya = coord.graph[0].child;
        for (var i = 0; i < ya.length; i++) {
            var id = ya[i].id;
            var el;
            if (buttons[id])
                el = buttons[id];
            else
                el = buttons[id] = createButton(ya[i]);
        }
    };

    this.update();
}

function CaptionRect(parent, transf){
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    svg.setAttribute("fill","black");
    svg.setAttribute("opacity",0);
    svg.setAttribute("stroke","black");
    svg.setAttribute("pointer-events","all");
    this.el=svg;
    parent.appendChild(svg);
    this.update=function(){
        svg.setAttribute("x",transf.box.x);
        svg.setAttribute("y",transf.box.y);
        svg.setAttribute("width",transf.box.w);
        svg.setAttribute("height",transf.box.h);
    };
}

function Chart(id, data) {
    var el = document.getElementById(id);
    if (!el)
        return;

    var div=document.createElement("div");
    div.className="chart";

    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    //var svg = document.createElement("svg");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    //svg.setAttribute("viewBox", "0 0 800 1400");
    //svg.className.baseVal = "chart";

    var graphdata = convData([data]);
    var fullGraph = new ModelCoord();
    fullGraph.setData(graphdata);

    var ranger = new Ranger();
    ranger.setSource(fullGraph);

    var transf_graph = new Transformer();
    transf_graph.setGraph(ranger.target);
    var axies_x = new XScale(svg, ranger.target.xAxis, transf_graph, 6);
    var axies_y = new YScale(svg, ranger.target.yAxis, transf_graph, 6);
    var graph = new GraphLine(svg, ranger.target, transf_graph, {strokeWidth:3});
    var transf_graph_cap = new Transformer(true);
    var point = new PointInfo(svg, ranger.target, transf_graph);
    var rc=new CaptionRect(svg, transf_graph_cap);
    point.setCapture(rc.el);

    var transf_nav = new Transformer();
    transf_nav.setGraph(fullGraph);
    var graph_full = new GraphLine(svg, fullGraph, transf_nav);
    var nav = new Navigator(svg, ranger, transf_nav, graph_full.el);

    div.appendChild(svg);
    el.appendChild(div);
    var buttons=new GraphButtons(el,fullGraph);

    transf_nav.registerObserver(nav);
    transf_nav.registerObserver(graph_full);
    transf_graph.registerObserver(graph);
    transf_graph.registerObserver(axies_x);
    transf_graph.registerObserver(axies_y);
    transf_graph.registerObserver(point);
    transf_graph_cap.registerObserver(rc);
    ranger.registerObserver(nav);
    ranger.registerObserver(transf_graph);
    fullGraph.registerObserver(transf_nav);
    fullGraph.registerObserver(ranger);
    fullGraph.registerObserver(buttons);

    resize();

    function resize(event) {
        var fontsize=parseFloat(getComputedStyle(el).fontSize);
        var bBox = svg.getBoundingClientRect();
        var nav_height =  Math.max(bBox.height/8, 40);//Math.max(4*fontsize, 50);
        transf_nav.setBox(0, bBox.height - nav_height, bBox.width, nav_height);
        transf_graph.setBox(0, 0, bBox.width, bBox.height - nav_height - 3*fontsize);
        transf_graph_cap.setBox(0, 0, bBox.width, bBox.height - nav_height - 3*fontsize);
    }

    function addEvent(object, type, callback) {
        if (object == null || typeof(object) == 'undefined') return;
        if (object.addEventListener) {
            object.addEventListener(type, callback, false);
        } else if (object.attachEvent) {
            object.attachEvent("on" + type, callback);
        } else {
            object["on"+type] = callback;
        }
    }

    resize_t = throttle(resize, 100);
    //window.onresize = resize_t;
    //window.addEventListener('resize', resize_t());
    addEvent(window, "resize", resize_t);
    //svg.onresize = resize_t;
}

function searchIdx(arr, val, type) {
    var l = 0, h = arr.length - 1, i, prev;
    while (l <= h) {
        i = /*Math.trunc*/((l + h) / 2) | 0;
        if (arr[i] < val) { l = i + 1; prev = -1; continue; }
        if (arr[i] > val) { h = i - 1; prev = 1; continue; }
        return i;
    }
    if (type === 2)
        if (prev === -1)
            if (typeof arr[i + 1]=="undefined" || arr[i + 1] - val > val - arr[i])
                return i;
            else
                return i + 1;
        else
            if (typeof arr[i - 1]=="undefined" || arr[i] - val < val - arr[i - 1])
                return i;
            else
                return i-1;
    if (type === 1)
        if (prev === -1 && typeof arr[i + 1]!="undefined")
            return i + 1;
        else
            return i;
    if (type === -1)
        if (prev === -1  || typeof arr[i - 1]=="undefined")
            return i;
        else
            return i - 1;

}

function Observable() {
    var self = this;
    this.observers = [];
    this.registerObserver = function (observer) {
        self.observers.push(observer);
    };
    this.notifyAll = function () {
        self.observers.forEach(function (observer) {
            observer.update();
        });
    };
}

function Animatable() {
    var self = this;
    this.animate = function (func, dur) {
        var start = Date.now();

        function tick(now) {
            if (rafid !== self.rafid)
                return;
            var progress = Math.min((Date.now() - start) / dur, 1);
            func(progress);
            if (progress < 1) requestAnimationFrame(tick);
        }

        var rafid = self.rafid = requestAnimationFrame(tick);
    };
}

function getCurvalue(from_v, to_v, progress) {
    return (to_v - from_v) * progress + from_v;
}

function Transformer(withoutScale) {
    Observable.call(this);
    Animatable.call(this);
    var self = this;
    this.setBox = function (x, y, w, h) {
        this.box = { x:x, y:y, w:w, h:h };
        self.update();
    };
    var scale, offset;
    this.setGraph = function (graph) {
        this.axis = {
            x: graph.xAxis,
            y: graph.yAxis
        };
        if (this.box)
            this.update();
    };
    function calc_scale(w, axis, gap) {
        return w / (axis.high - axis.low + (gap||0));
    }
    this.update = function () {
        if(withoutScale && this.box){
            this.notifyAll();
            return;
        }
        if (!this.axis || !this.box)
            return;

        var from = { scale: scale, offset: offset },
            to = {
                scale: {
                    x: calc_scale(this.box.w, this.axis.x),
                    y: calc_scale(this.box.h, this.axis.y, this.axis.y.high/10)
                },
                offset: {
                    x: this.axis.x.low,
                    y: this.axis.y.low
                }
            };
        if (!from.scale) {
            scale = to.scale;
            offset = to.offset;
            this.notifyAll();
        } else
            self.animate(move(from, to), 100);
    };
    this.toView = function (v, d) {
        v = Math.trunc((v - offset[d]) * scale[d]);
        if (d === 'y')
            return self.box.y + self.box.h - v;
        return v;
    };
    this.toUnit = function (v, d) {
        if(!d)d="x";
        return v / scale[d] + offset[d];
    };
    function move(from, to) {
        return function (progress) {
            scale = {
                x: getCurvalue(from.scale.x, to.scale.x, progress),
                y: getCurvalue(from.scale.y, to.scale.y, progress)
            };
            offset = {
                x: getCurvalue(from.offset.x, to.offset.x, progress),
                y: getCurvalue(from.offset.y, to.offset.y, progress)
            };
            self.notifyAll();
        };
    }
}

function ModelCoord() {
    Observable.call(this);
    var self = this;
    this.xAxis = new ModelAxies();
    this.yAxis = new ModelAxies({ lowfixed: 0, highflow: true });

    this.graph = [];

    this.setData = function (dataarr) {
        var xa = [], ya = [];
        for (var k = 0; k < dataarr.length; k++) {
            var data = dataarr[k];
            var xdata = new ModelGraph();
            xdata.data = data.x.data;
            xa.push(xdata.data);
            self.graph.push(xdata);
            var y = data.x.y;
            for (var i = 0; i < y.length; i++) {
                var ydata = new ModelGraph();
                ydata.data = y[i].data;
                ydata.name = y[i].name;
                ydata.color = y[i].color;
                ydata.id = y[i].id;
                ya.push(ydata.data);
                xdata.child.push(ydata);
            }
        }
        self.xAxis.calc(xa);
        self.yAxis.calc(ya);
        self.notifyAll();
    };
    this.update=function(){
        var xa = [], ya = [];
        for (var k = 0; k < self.graph.length; k++) {
            //xa.push(self.graph[k].data);
            var y = self.graph[k].child;
            for (var i = 0; i < y.length; i++)
                if(!y[i].disable)
                    ya.push(y[i].data);
        }
        //self.xAxis.calc(xa);
        self.yAxis.calc(ya);
        self.notifyAll();
    };
}

function convData(dataarr) {
    var resarr = [];
    for (var k = 0; k < dataarr.length; k++) {
        var data = dataarr[k];
        var res = {
            x: {
                y: []
            }
        };
        for (var i = 0; i < data.columns.length; i++) {
            var col = data.columns[i][0];
            if (data.types[col] === 'x')
                res.x.data = data.columns[i].slice(1);
            if (data.types[col] === 'line')
                res.x.y.push({
                    id: col,
                    data: data.columns[i].slice(1),
                    name: data.names[col],
                    type: data.types[col],
                    color: data.colors[col]
                });
        }
        resarr.push(res);
    }
    return resarr;
}

function Ranger() {
    Observable.call(this);
    var self = this;

    this.setSource = function (source) {
        this.source = source;
        this.target = new ModelCoord();
        xa = source.graph;
        for (var i = 0; i < xa.length; i++)
            this.target.graph.push(xa[i].createLinkGraph());

        if (typeof self.high === "undefined")
            self.high = source.xAxis.high;
        if (typeof self.low === "undefined")
            self.low = source.xAxis.high - (source.xAxis.high - source.xAxis.low) / 10;//10 * 24 * 3600 * 1000
        this.target.xAxis.origin = source.xAxis.low;
        this.setRange(self.low, self.high);
    };

    this.setRange = function (l, h) {
        var t = self.target;
        if(h<=l)
            return;
        self.low = l;
        self.high = h;
        var xa = t.graph, ya = [];
        //t.xAxis.setRange(l,h);
        t.xAxis.low = l;
        t.xAxis.high = h;
        for (var i = 0; i < xa.length; i++) {
            if (xa[i].source) {
                var sx = xa[i].source.data;
                var li = searchIdx(sx, l, -1);
                var hi = searchIdx(sx, h, 1);
                var lg = Math.max(li - 20, 0);
                xa[i].data = sx.slice(lg, hi + 20);
                for (var j = 0; j < xa[i].child.length; j++) {
                    var y = xa[i].child[j];
                    if (y.source) {
                        y.data = y.source.data.slice(lg, hi + 20);
                        y.disable =y.source.disable;
                    }
                    if(!y.source.disable)
                        ya.push(y.source.data.slice(li, hi));
                }
            }
            t.yAxis.calc(ya);
        }
        self.notifyAll();
    };

    this.update = function () {
        this.setRange(self.low, self.high);
    };
}

function ModelAxies(opt) {
    var options = opt || {};
    var self = this;

    this.calc = function (data) {
        self.low = undefined;
        self.high = undefined;
        var skipMin = false;
        if (options.lowfixed != undefined) {
            self.low = options.lowfixed;
            self.origin = options.lowfixed;
            skipMin = true;
        }
        var la = [], ha = [];
        for (var i = 0; i < data.length; i++) {
            if (!skipMin)
                la.push(Math.min.apply(null, data[i]));
            ha.push(Math.max.apply(null, data[i]));
        }
        if (!skipMin)
            self.low = Math.min.apply(null, la);
        self.high = Math.max.apply(null, ha);
    };
}

function ModelGraph(opt) {
    var self = this;
    var data;
    this.data = [];
    this.child = [];
    this.createLinkGraph = function () {
        var res = new ModelGraph();
        res.source = self;
        res.name = self.name;
        res.color = self.color;
        res.id = self.id;
        for (var i = 0; i < self.child.length; i++)
            res.child.push(self.child[i].createLinkGraph());
        return res;
    };
}

function checkRaf() {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for (var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x] + 'CancelAnimationFrame'] || window[vendors[x] + 'CancelRequestAnimationFrame'];
    }

    if (!window.requestAnimationFrame)
        window.requestAnimationFrame = function (callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function () { callback(currTime + timeToCall); },
                timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };

    if (!window.cancelAnimationFrame)
        window.cancelAnimationFrame = function (id) {
            clearTimeout(id);
        };
}

checkRaf();