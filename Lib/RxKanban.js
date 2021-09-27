const rxjq = $.noConflict();
class DomHelper {
    eventMapper = []
    dataMapper = []
    createNewElement(element, onlyString = false) {
            const me = this;
            if (element && element.visible === false) return "";
            if (!element || !element.tag) return (onlyString ? `<div></div>` : rxjq(`<div></div>`));
            if (!element.id) element.id = this.ID;
            if (element.listners) {
                let ev = this.eventMapper.filter(e => e.id == element.id);
                if (ev && ev.length > 0) {
                    ev.listners = element.listners;
                } else {
                    ev = {
                        id: element.id,
                        listners: element.listners
                    }
                }
                this.eventMapper.push(ev);
            }
            if (element.data) {
                let elData = this.dataMapper.filter(e => e.id == element.id);
                if (elData && elData.length > 0) {
                    elData.data = element.data;
                } else {
                    elData = {
                        id: element.id,
                        data: element.data
                    }
                }
                this.dataMapper.push(elData)
            }
            let attrs = Object.keys(element);

            let elStr = `<${element.tag} ${attrs.map(a => {
            if (
                typeof (element[a]) != "object"
                && (
                    typeof (element[a]) == "string"
                    || typeof (element[a]) == "number"
                    || (
                        typeof (element[a]) == "boolean"
                        && element[a] == true
                    )
                )
                && a != "tag"
                && a != "innerHtml"
            ) {
                return `${(a == "className" ? "class" : a)} = "${element[a]}" `
            }
        }).join("")
            }>
        ${(element.innerHtml ? element.innerHtml : "")}
        ${(element.children && Array.isArray(element.children))
                ? element.children.map(c => {
                    return me.createNewElement(c, true)
                }).join("")
                : ""}
        </${element.tag}>`
        return !onlyString ? this.MapListners(this.MapData(rxjq(elStr))) : elStr;
    }
    get ID() {
        return '_' + Math.random().toString(36).substr(2, 9);
    }
    MapData(domObject) {
        this.dataMapper.forEach(e => {
            if (e && e.data) {
                let element = domObject.find(`#${e.id}`);
                if (element.length == 0 && domObject.id == e.id) element = domObject;
                element.data(e.data);
            }
        })
        return domObject;
    }
    MapListners(domObject) {
        this.eventMapper.forEach(e => {
            if (e && e.listners) {
                let element = domObject.find(`#${e.id}`);
                if (element.length == 0 && domObject.id == e.id) element = domObject;
                let listners = Object.keys(e.listners);
                listners.forEach((l) => {
                    if (typeof (e.listners[l]) == "function") {
                        element.on(`${l}`, e.listners[l]);
                    }

                })
            }
        })
        return domObject;
    }
}
class AjaxHelper {

    fetch(url, options = {}) {
        const controller = new AbortController();

        // Need to assign AbortController individually, because IE11 polyfill of the Fetch API deletes 'signal' property on fetchOptions object
        Object.assign(options, {
            abortController: controller,
            signal: controller.signal
        });

        if (!('credentials' in options)) {
            options.credentials = 'include';
        }
        if (options.queryParams) {
            const params = Object.entries(options.queryParams);
            if (params.length) {
                url += (url.includes('?') ? '&' : '?') + params.map(([param, value]) =>
                    `${param}=${encodeURIComponent(value)}`
                ).join('&');
            }
        }

        //<debug>
        if (url.match(/undefined|null|\[object/)) {
            throw new Error('Incorrect URL: ' + url);
        }
        //</debug>

        // Promise that will be resolved either when network request is finished or when json is parsed
        const promise = new Promise((resolve, reject) => {
            fetch(url, options).then(
                response => {
                    if (options.parseJson) {
                        response.json().then(json => {
                            response.parsedJson = json;
                            resolve(response);
                        }).catch(error => {
                            response.parsedJson = null;
                            response.error = error;
                            reject(response);
                        });
                    }
                    else if (options.parseText) {
                        response.text().then(text => {
                            response.parsedText = text;
                            resolve(response);
                        }).catch(error => {
                            response.parsedJson = null;
                            response.error = error;
                            reject(response);
                        });
                    }
                    else {
                        resolve(response);
                    }
                }
            ).catch(error => {
                error.stack = promise.stack;

                // Unless calling code aborted the request, reject this operation
                if (error.name !== 'AbortError') {
                    reject(error);
                }
            });
        });

        promise.stack = new Error().stack;

        promise.abort = function () {
            controller.abort();
        };

        return promise;
    }
    get(url, options = {}) {
        return this.fetch(url, options);
    }
    post(url, payload, options = {}) {
        if (!(payload instanceof FormData) && !(typeof payload === 'string')) {
            payload = JSON.stringify(payload);

            options.headers = options.headers || {};

            options.headers['Content-Type'] = options.headers['Content-Type'] || 'application/json';
        }

        return this.fetch(url, Object.assign({
            method: 'POST',
            body: payload
        }, options));
    }
}
class RxDataSource {
    _config = {
        load: {
            url: "",
            param: [],
            headers: []
        }
    };
    _data;
    _ajax = new AjaxHelper();
    constructor(config) {
        this._config = { ...this._config, ...config };
    }
    static get type() {
        return 'rxdatasource';
    }
    get loadUrl() {
        let param = this._config.load.param ? decodeURIComponent(rxjq.param(this._config.load.param)) : "";
        return `${this._config.load.url}?${param}`;
    }

    async getData() {
        return (await this._ajax.get(this.loadUrl, { parseJson: true, credentials: "omit" })).parsedJson
    }
}
class RxKanban {
    _config = {
        container: "",
        dataSource: null,
        laneIdAssocianField: "laneId",
        laneIdField: "id",
        cardIdField: "id",
        laneNameField: "name",
        toolbar: {
            zoom: false,
            expand: false,
            collapse: false
        },
        lane: {
            resizable: true,
            sortable: true,
            width: 328,
            height: -1,
            onResizeStart: () => { },
            render: () => { }
        },
        card: {
            width: 260,
            height: 170,
            render: () => { }
        },
        autoLoad: false,
        onActivate: () => { },
        onBeforeStop: () => { },
        onChange: () => { },
        onCreate: () => { },
        onDeactivate: () => { },
        onOut: () => { },
        onOver: () => { },
        onReceive: () => { },
        onRemove: () => { },
        onSort: () => { },
        onStart: () => { },
        onStop: () => { },
        onUpdate: () => { },
        onLaneOrderChange: () => { }
    };
    _containerEl;
    _cards = [];
    _lanes = [];
    _dom = new DomHelper();
    __cardselements = [];
    __cardContainerWidgth;
    _rawData = {
        lanes: [],
        cards: []
    }
    _zoom = 10;
    _beforeCommitCard;
    constructor(config) {
        this.__mergeObject(this._config, config);
        if (this._config.autoLoad) {
            this.init();
        }
    }
    __mergeObject(target, source) {
        const me = this;
        for (const key of Object.keys(source)) {
            if (source[key] instanceof Object && source[key].constructor.name == "Object") Object.assign(source[key], me.__mergeObject(target[key], source[key]))
        }
        Object.assign(target || {}, source)
        return target
    }
    get DataSource() {
        return this._rawData;
    }
    Options(config) {
        this.__mergeObject(this._config, config);
        return this.init();
    }
    get laneIdProp() {
        return this._config.laneIdField || "id";
    }
    get laneIdAssoProp() {
        return this._config.laneIdAssocianField || "laneId";
    }
    get cardIdProp() {
        return this._config.cardIdField || "id";
    }
    get laneNameProp() {
        return this._config.laneNameField || "name";
    }
    get __maskElement() {
        return this._dom.createNewElement({
            tag: "div",
            className: "kbn-loading-mask-backdrop",
            children: [{
                tag: "div",
                className: "kbn-loading-mask",
                children: [1, 2, 3, 4, 5, 6, 7, 8]
            }]
        });
    }
    init() {
        const me = this;
        me._containerEl = rxjq(me._config.container);
        me._cards = [];
        me._lanes = me.ghostLane;
        me._containerEl.empty();
        me._containerEl.append(me._dom.createNewElement(me.__rootElementConfig));
        me.mask();
        return new Promise((resolve, reject) => {
            setTimeout(async () => {
                if (!me._config.container || rxjq(me._config.container).length == 0) {
                    throw "Please provide a valid container"
                }
                let data = await ((me._config.dataSource
                    && me._config.dataSource.constructor
                    && me._config.dataSource.constructor.name == "RxDataSource") ?
                    me._config.dataSource.getData() : me._config.dataSource);
                me._rawData = { ...me._rawData, ...data }
                me._cards = JSON.parse(JSON.stringify(me._rawData.cards));
                me._lanes = JSON.parse(JSON.stringify(me._rawData.lanes));

                let kElement = me._dom.createNewElement(me.__rootElementConfig);
                me._containerEl.empty();
                me._containerEl.append(kElement);
                me.startDrangging();
                me.setCardWidth();
                me.unmask();
                resolve(true)
            }, 200);

        })
    }
    get ghostLane() {
        return [1, 2, 3, 5, 6].map((e) => {
            let lane = {};
            lane[this._config.laneNameField] = "";
            return lane;
        });
    }
    get __rootElementConfig() {
        const me = this;
        let root = {
            tag: "div",
            className: "kbn-board-container-main roxkanban",
            style: "display:-webkit-box;overflow:hidden",
            children: [{
                tag: "div",
                className: "rx-kbn-container",
                style: `width:${document.documentElement.clientWidth}px;`,
                children: [].concat(this.getLanes(this._lanes))
            }
            ]
        }
        if (this._config.toolbar.zoom) {
            root.children.unshift({
                tag: "div",
                children: [{
                    tag: "span",
                    innerHtml: "Zoom:"
                }, {
                    tag: "input",
                    type: "range",
                    min: 1,
                    max: 10,
                    value: 10,
                    listners: {
                        input: (e) => {
                            me.zoomCards(e.target.value);
                        }
                    }
                }]
            })
        }
        return root;
    }
    mask(option) {
        const me = this;
        if (rxjq(".kbn-loading-mask-backdrop").length > 0) rxjq(".kbn-loading-mask-backdrop").remove(); 
        let maskElement = me.__maskElement;
        if (option) {
            if (option.loader === false) {
                maskElement.find(".kbn-loading-mask").hide();
            }
            if (option.backgroundColor && option.backgroundColor != "") {
                maskElement.css({ "background-color": option.backgroundColor})
            }
            if (option.OnBackDropClick && typeof option.OnBackDropClick == "function") {
                maskElement.on("click", () => {
                    option.OnBackDropClick();
                });
            }
        }
        rxjq(document.body).prepend(maskElement);
    }
    unmask() {
        if (rxjq(".kbn-loading-mask-backdrop").length > 0) rxjq(".kbn-loading-mask-backdrop").remove();
    }
    refreshLanes() {
        this._containerEl.empty();
        this._containerEl.append(this._dom.createNewElement({
            tag: "div",
            className: "kbn-board-container-main",
            children: [{
                tag: "div",
                className: "rx-kbn-container",
                children: [].concat(this.getLanes())
            }]
        }));
        this.startDrangging();
        this.setCardWidth();
    }
    refreshCards() {
        const me = this;
        this._lanes.forEach(lane => {
            let laneElement = rxjq(`#lane-${lane[this.laneIdProp]}`);
            if (laneElement && laneElement.length > 0) {
                laneElement.empty();
                this.getCards(lane).forEach(c => {
                    laneElement.append(this._dom.createNewElement(c))
                })
                me.updateCount(lane);
            }
        });
        this.setCardWidth();
    }
    refreshCard(card) {
        const me = this;
        let lane = this._lanes.filter(l => l[this.laneIdProp] == card[this.laneIdAssoProp])[0];
        let laneElement = rxjq(`#lane-${lane[this.laneIdProp]}`);
        let cardElement = rxjq(`div[id*="idx-card-${card[this.cardIdProp]}-"]`);
        if (cardElement.length > 0) {
            let currentLane = cardElement.data("lane");
            if (!currentLane) {
                currentLane = me.getLaneById(cardElement.attr("laneid"));
                if (!currentLane) return;
            }
            let NewcardElement = this._dom.createNewElement(this.getCard(card, lane));
            if (currentLane[this.laneIdProp] == lane[this.laneIdProp]) {
                cardElement.replaceWith(NewcardElement);
            }
            else {
                cardElement.remove();
                laneElement.prepend(NewcardElement);
                me.updateCount(lane);
            }
            let rawCard = this._rawData.cards.filter(c => c[this.cardIdProp] == card[this.cardIdProp]);
            if (rawCard.length > 0) {
                Object.assign(rawCard[0], card);
                
            }
            me.setCardWidth(NewcardElement);
        }
    }
    refreshLane(laneId) {
        let lane = this._lanes.filter(l => l[this.laneIdProp] == laneId);
        if (lane && lane.length > 0) {
            let laneElement = rxjq(`#lane-${lane[0][this.laneIdProp]}`);
            if (laneElement && laneElement.length > 0) {
                laneElement.empty();
                this.getCards(lane[0]).forEach(c => {
                    laneElement.append(this._dom.createNewElement(c))
                })
            }
        }

    }
    zoomCards(val) {
        const me = this;
        if (val > 10 || val < 1) throw "Please pass the zoom value between 1 to 10";

        let cardElements = rxjq(".kbn-card-wrapper");
        if (cardElements.length == 0) return;
        if (val == 10) {
            cardElements.css({ "height": "", width: `${me.getCardWidth()}px` });
            this._zoom = 10
        }
        else {
            let height = rxjq(cardElements[0]).outerHeight();
            let width = rxjq(cardElements[0]).outerWidth();
            cardElements.css({ "height": (height * val / this._zoom) + "px", width: (width * val / this._zoom) + "px", "min-height": "0px" })
            this._zoom = val;
        }
    }
    __applyFilter(array, filters) {
        if (typeof (filters) == "object") {
            const filterKeys = Object.keys(filters);
            return array.filter(item => {
                // validates all filter criteria
                return filterKeys.every(key => {
                    // ignores non-function predicates
                    if (typeof filters[key] !== 'function') return true;
                    return filters[key](item[key]);
                });
            });
        }
        else if (typeof filters == "function") {
            return array.filter(item => filters(item));
        }
    }
    searchCards(filters) {
        let filterData = this.__applyFilter(this._rawData.cards, filters);
        this._cards = JSON.parse(JSON.stringify(filterData));
        this.refreshCards();
        this.setCardWidth();
    }
    clearSearch() {
        this._cards = JSON.parse(JSON.stringify(this._rawData.cards));
        this.refreshCards();
        this.setCardWidth();
    }
    getEventData(event, ui) {

        let senderLane = this.getLaneById(ui.item.attr("laneid"));
        let recieverLane = this.getLaneById(rxjq(event.target).attr("laneid"));
        let card = this.getCardById(ui.item.attr("cardid"));
        return {
            senderLane: senderLane,
            recieverLane: recieverLane,
            card: card
        }
    }
    cancelLastTransaction() {
        const me = this;
        if (me._beforeCommitCard) {
            let card = this._cards.filter(c => c[me.cardIdProp] == me._beforeCommitCard[me.cardIdProp]);
            if (card.length > 0) {
                Object.assign(card[0], me._beforeCommitCard)
                this._beforeCommitCard = null;
                me.refreshCard(card[0]);
            }
        }
    }
    setCardWidth(card) {
        let cards = card || rxjq(".kbn-card-wrapper");
        let containerWidth = (card ? card.closest(".kbn-cards").width() : rxjq(".kbn-cards").width()) - 14;
        if (!card) this.__cardContainerWidgth = containerWidth;
        cards.css({ "width": `${(containerWidth)}px` });
        if (this._zoom < 10) {
            let zoomVal = this._zoom;
            this._zoom = 10;
            this.zoomCards(zoomVal);
        }
    }
    startDrangging() {
        const me = this;
        const sortEl = this._containerEl.find("div[id*='lane-card-body-'] .kbn-cards");
        sortEl.sortable({
            connectWith: ".kbn-cards",
            placeholder: "card-drop-placeholder kbn-card-wrapper",
            cancel: ".kbn-readonly",
            tolerance: "pointer",
            scrollSpeed: 80,
            scrollSensitivity:80,
            helper: (event, ui) => {
                let clone = rxjq(ui).clone();
                rxjq('.rx-kbn-container.ui-sortable').append(clone);
                clone.hide();
                setTimeout(function () {
                    clone.appendTo('body');
                    clone.show();
                }, 1);
                return clone;
            },
            start: function (e, ui) {
                ui.placeholder.height(ui.item.height());
                ui.placeholder.width(me.getCardWidth());
            },
            receive: (event, ui) => {
                let eventData = me.getEventData(event, ui);
                let senderLane = eventData.senderLane;
                let recieverLane = eventData.recieverLane;
                let card = eventData.card;
                this._beforeCommitCard = Object.assign({}, card);
                let isCancel = false;
                if (me._config.onReceive) {
                    let result = me._config.onReceive({
                        senderLane: senderLane,
                        recieverLane: recieverLane,
                        card: card
                    });
                    if (typeof (result) != "undefined" && result == false) {
                        isCancel = true;
                        
                    }
                }
                card[me.laneIdAssoProp] = recieverLane[me.laneIdProp];
                ui.item.data("lane", recieverLane)
                ui.item.data("card", card)
                me.updateCount(senderLane);
                me.updateCount(recieverLane);
                if (!isCancel) {
                    me.refreshCard(card);
                } else {
                    me.cancelLastTransaction();
                }
            },
            beforeStop: (event, ui) => {
                let eventData = me.getEventData(event, ui);
                let senderLane = eventData.senderLane;
                let recieverLane = eventData.recieverLane;
                let card = eventData.card;
                if (me._config.onBeforeStop) {
                    let result = me._config.onBeforeStop({
                        senderLane: senderLane,
                        recieverLane: recieverLane,
                        card: card
                    });
                    if (typeof (result) != "undefined" && result == false) {
                        sortEl.sortable("cancel");
                    }
                }
              
            }

        });
        if (me._config.lane.sortable) {
            this._containerEl.find(".rx-kbn-container").sortable({
                placeholder: "lane-drop-placeholder kbn-lane-root",
                handle: ".kbn-card-header",
                items:"div.kbn-lane-root:not(.non-sortable)",
                scroll: true,
                scrollSpeed: 80,
                scrollSensitivity: 80,
                tolerance: "pointer",
                start: function (e, ui) {
                    ui.placeholder.height(ui.item.height());
                    ui.placeholder.width(ui.item.width());
                },
                stop: (event, ui) => {
                    let lanes = [];
                    rxjq("div[id*='kbn-lane-root-']").map(function () {
                        lanes.push(rxjq(this).attr('laneid'));
                    });
                    if (me._config.onLaneOrderChange && typeof me._config.onLaneOrderChange == "function") {
                        me._config.onLaneOrderChange(lanes)
                    }
                 }
            });
        }
        
        if (me._config.lane.resizable) {
            rxjq('.kbn-lane-root').resizable(
                {
                    animate: true,
                    ghost: true
                });
        }
    }
    get __visualHeight() {
        return visualViewport.height / window.devicePixelRatio;
    }
    get __visualWidth() {
       return visualViewport.width / window.devicePixelRatio;
    }
    getLaneById(id) {
        let lane = this._lanes.filter(l => l[this.laneIdProp] == id);
        return lane.length > 0 ? lane[0] : null;
    }
    getCardById(id) {
        let card = this._cards.filter(c => c[this.cardIdProp] == id);
        return card.length > 0 ? card[0] : null;
    }
    getCardsByLaneId(laneId) {
        let cards = this._cards.filter(c => c[this.laneIdAssoProp] == laneId);
        return cards
    }
    updateCount(lane) {
        let countElement = rxjq(`#spn-count-${lane[this.laneIdProp]}`);
        countElement.text(`(${this.cardCount(lane)})`);
    }
    cardCount(lane) {
        let cards = this._cards.filter(c => c[this.laneIdAssoProp] == lane[this.laneIdProp]);
        return cards.length;
    }
    getLaneWidth() {
        let calWidth = ((this.__visualWidth / this._lanes.length) - 3);
        return calWidth > this._config.lane.width ? calWidth : this._config.lane.width;
    }
    getLaneHeight() {
        let calHeight = (this.__visualHeight - 61);
        return this._config.lane.height == -1 ? calHeight : this._config.lane.height;
    }
    getCardWidth() {
        let calWidth = ((this.__visualWidth / this._lanes.length) - 50);
        return this.__cardContainerWidgth || (calWidth > this._config.card.width ? calWidth : this._config.card.width);
    }
    getCardHeight() {
        return this._config.card.height;
    }
    getLanes(lanes) {
        if (lanes && Array.isArray(lanes)) {
            return lanes.map(lane => {
                return {
                    tag: "div",
                    className: `kbn-lane-root${lane.movable === false ? " non-sortable" : ""}`,
                    style: `width:${this.getLaneWidth()}px`,
                    id: `kbn-lane-root-${lane[this.laneIdProp]}`,
                    laneid: lane[this.laneIdProp],
                    children: [
                        {
                            tag: "div",
                            className: "kbn-inner-lane",
                            children: [
                                {
                                    tag: "div",
                                    className: "kbn-card-header",
                                    children: [
                                        {
                                            tag: "div",
                                            className: "kbn-card-title",
                                            innerHtml: `${lane[this.laneNameProp]} <span id="spn-count-${lane[this.laneIdProp]}">(${this.cardCount(lane)}) </span>`
                                        },
                                        {
                                            tag: "img",
                                            className: "img-collapse-btn",
                                            listners: {
                                                click: () => { this.onHideLaneClick(lane) }
                                            }

                                        }
                                    ]
                                },
                                {
                                    tag: "div",
                                    className: "card-body-scroll",
                                    style: `height:${this.getLaneHeight()}px`,
                                    id: `lane-card-body-${lane[this.laneIdProp]}`,
                                    children: [
                                        {
                                            tag: "div",
                                            className: "kbn-cards",
                                            id: `lane-${lane[this.laneIdProp]}`,
                                            data: { lane: lane },
                                            laneid: lane[this.laneIdProp],
                                            children: [].concat(this.getCards(lane))
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            });
        }
    }
    getCard(card, lane) {
        let cardEl = this._config.card.render(card, lane)
        let cardWrapper = {
            tag: "div",
            className: "kbn-card-wrapper",
            id: `idx-card-${card[this.cardIdProp]}-${lane[this.laneIdProp]}`,
            data: { lane: lane, card: card },
            laneid: lane[this.laneIdProp],
            cardid: card[this.cardIdProp],
            style: `border-left:3px solid ${card.borderColor || "green"}`,
            children: [cardEl]
        }
        if (card.ReadOnly) {
            cardWrapper.className = `${cardWrapper.className} kbn-readonly`;
            cardWrapper.children.push({
                tag: "div",
                className: "kbn-card-back-drop"
            })
        }
        return cardWrapper
    }
    getCards(lane) {
        let me = this;
        let cards = this._cards.filter(c => c[this.laneIdAssoProp] == lane[this.laneIdProp]);
        return cards.map(c =>
         {
            return me.getCard(c , lane);
        })
    }
    ShowAllLane() {
        const me = this;
        this._lanes.forEach(l => me.onShowLaneClick(l));
    }
    HideAllLane() {
        const me = this;
        this._lanes.forEach(l => me.onHideLaneClick(l));
    }
    onShowLaneClick(lane) {
        let laneElement = rxjq(`#kbn-lane-root-${lane[this.laneIdProp]}`);
        if (laneElement.is(":visible")) return;
        let handlerElement = rxjq(`#kbn-lane-hide-handler-${lane[this.laneIdProp]}`);
        handlerElement.remove();
        laneElement.show("slide", { direction: "left" }, 500);
    }
    onHideLaneClick(lane) {
        const me = this;
        let laneElement = rxjq(`#kbn-lane-root-${lane[this.laneIdProp]}`);
        if (!laneElement.is(":visible")) return;
        laneElement.hide("slide", { direction: "left" }, 500);
        setTimeout(() => {
            this._dom.createNewElement({
                tag: "div",
                className: "kbn-lane-hide-handler",
                id: `kbn-lane-hide-handler-${lane[this.laneIdProp]}`,
                children: [{
                    tag: "img",
                    className: "img-expand-btn",
                    listners: {
                        click: () => { this.onShowLaneClick(lane) }
                    }

                }, {
                    tag: "span",
                    innerHtml: `${lane[this.laneNameProp]} (${me.cardCount(lane)})`
                }],

            }).insertBefore(laneElement);
        }, 500);

    }
}