(() => {
    window.kanban = new RxKanban({
        container: "#kanbanContainer",
        dataSource: new RxDataSource({
            load: {
                url: "http://localhost:52853/api/Demand/GetKanban"
            }
        }),
        autoLoad: true,
        card: {
            render: (card, lane) => {
                return {
                    tag: "div",
                    children: [{
                            tag: "header",
                            className: "card-header",
                            children: [{
                                tag: "div",
                                innerHtml: parseFloat(Math.random(5) * 10).toFixed(2),
                                className: "kbn-start-rating",
                                children: [{
                                    tag: "img",
                                    src: "watch-new-white.png",
                                    style: "height:12px;float:right;"
                                }]
                            }]
                        },
                        {
                            tag: "div",
                            className: "card-body",
                            children: [{
                                tag: "span",
                                innerHtml: card.code,
                                style: "color: #968e8e"
                            }, {
                                tag: "p",
                                className: "mb-0",
                                innerHtml: card.title,
                                style: "color: #4e4646"
                            }],

                        }, {
                            tag: "div",
                            className: "kbn-footer",
                            children: [{
                                    tag: "div",
                                    className: "kbn-form-control",
                                    children: [{
                                            tag: "span",
                                            className: "kbn-label",
                                            innerHtml: "Owner : "
                                        },
                                        {
                                            tag: "span",
                                            className: "kbn-value",
                                            innerHtml: "Anubrij"
                                        }
                                    ]
                                },
                                {
                                    tag: "div",
                                    className: "kbn-form-control",
                                    children: [{
                                            tag: "span",
                                            className: "kbn-label",
                                            innerHtml: "Start Date : "
                                        },
                                        {
                                            tag: "span",
                                            className: "kbn-value",
                                            innerHtml: "2020-01-01"
                                        }
                                    ]
                                },
                                {
                                    tag: "div",
                                    className: "kbn-form-control",
                                    children: [{
                                            tag: "span",
                                            className: "kbn-label",
                                            innerHtml: "Finish Date : "
                                        },
                                        {
                                            tag: "span",
                                            className: "kbn-value",
                                            innerHtml: "2021-01-01"
                                        }
                                    ]
                                }, {
                                    tag: "img",
                                    src: "placeholder.gif",
                                    className: "kbn-user-image"
                                }
                            ]
                        }
                    ]
                }
            }
        }
    })
})()


let s = 123456789;

function random() {
    s = (1103515245 * s + 12345) % 2147483647;
    return s % (10 - 1);
}

function generateData(count) {
    let i;
    const surnames = ['Smith', 'Johnson', 'Brown', 'Taylor', 'Anderson', 'Harris', 'Clark', 'Allen', 'Scott', 'Carter'];
    const names = ['James', 'John', 'Robert', 'Christopher', 'George', 'Mary', 'Nancy', 'Sandra', 'Michelle', 'Betty'];
    const gender = ['Male', 'Female'];
    const items = [];
    const startBirthDate = Date.parse('1/1/1975');
    const endBirthDate = Date.parse('1/1/1992');

    for (i = 0; i < count; i++) {
        const birthDate = new Date(startBirthDate + Math.floor(
            random() *
            (endBirthDate - startBirthDate) / 10));
        birthDate.setHours(12);

        const nameIndex = random();
        const item = {
            id: i + 1,
            firstName: names[nameIndex],
            lastName: surnames[random()],
            gender: gender[Math.floor(nameIndex / 5)],
            birthDate: birthDate
        };
        items.push(item);
    }
    return items;
}