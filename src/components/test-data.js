const files = [
    {
      Key:'2023-1.json', LastModified:new Date('2023-01-16'), content:
        {
          "type":"performance",
          "title":"Start 2023",
          "when":"",
          "scores":[
            "lux-20220911",
            "friend-20220919",
            "grease-is-the-word-20230116",
            "beyond-20230116",
            "Shine-20230124"
          ]
        }
      },
    {Key:'lux-20220911.json', LastModified:new Date('2022-09-11'), content:{
        "title":"Lux Aeterna",
        "scores":[
          {
            "subtitle":"",
            "parts":[
              {"name":"Soprano 1","url":"/Lux_aeterna2.mid?track=0&prog=53","volume":0.5},
              {"name":"Soprano 2","url":"/Lux_aeterna2.mid?track=1&prog=53","volume":0.5},
              {"name":"Alto","url":"/Lux_aeterna2.mid?track=2&prog=54","volume":0.5},
              {"name":"Tenor","url":"/Lux_aeterna2.mid?track=3&prog=52","volume":0.5},
              {"name":"Bass 1","url":"/Lux_aeterna2.mid?track=4&prog=52","volume":0.5},
              {"name":"Bass 2","url":"/Lux_aeterna2.mid?track=5&prog=52","volume":0.5}
            ],
            "bars":[
              {"from":1,"tempo":40,"timeSig":3,"beats":135}
            ]
          }
        ]
      }},
    {Key:'friend-20220919.json', LastModified:new Date('2022-09-19'),content:{
      "title":"You've got a Friend",
      "scores":[
        {
          "subtitle":"",
          "parts":[
            {"name":"Soprano","url":"/friend.mid?track=0&prog=52","volume":0.3},
            {"name":"Alto","url":"/friend.mid?track=1&prog=52","volume":0.36},
            {"name":"Men","url":"/friend.mid?track=2&prog=52","volume":0.45},
            {"name":"Piano","url":"/friend.mid?track=4","volume":0.6}
          ],
          "bars":[
            {"from":1,"tempo":92,"timeSig":2,"beats":2},
            {"from":1,"timeSig":4,"beats":416}
          ]
        }
      ]
    }},
    {Key:'grease-is-the-word-20230116.json', LastModified:new Date('2023-01-17'), content:{
        "title":"Grease is the Word2",
        "scores":[
          {
            "subtitle":"",
            "parts":[
              {"name":"Any Voice","url":"/Grease is the word_unrolled2.mid?track=0&prog=52","volume":0.6},
              {"name":"Soprano","url":"/Grease is the word_unrolled2.mid?track=1&prog=52","volume":0.5},
              {"name":"Alto","url":"/Grease is the word_unrolled2.mid?track=2&prog=52","volume":0.6},
              {"name":"Men","url":"/Grease is the word_unrolled2.mid?track=3&prog=52","volume":0.6},
              {"name":"Piano","url":"/Grease is the word_unrolled2.mid?track=4","volume":1}
            ],
            "bars":[
              {"from":1,"tempo":110,"timeSig":4,"beats":112},
              {"repeat":1,"beats":84},
              {"from":29,"repeat":2,"beats":76},
              {"from":50,"beats":16},
              {"from":54,"tempo":126,"timeSig":4,"beats":16},
              {"repeat":1,"beats":72},
              {"from":58,"repeat":2,"beats":48},
              {"from":76,"beats":96},
              {"timeSig":2,"beats":2},
              {"timeSig":4,"beats":88},
              {"tempo":85,"beats":36},
              {"tempo":70,"beats":2},
              {"tempo":40,"beats":6},
              {"timeSig":2,"beats":2},
              {"timeSig":4,"tempo":60,"beats":4},
              {"tempo":50,"beats":4},
              {"tempo":100,"timeSig":2,"beats":176},
              {"repeat":1, "beats":8},
              {"from":225,"repeat":2,"beats":8},
              {"repeat":1, "beats":8},
              {"from":229,"repeat":2,"beats":8},
              {"repeat":1, "beats":8},
              {"from":233,"repeat":2,"beats":6},
              {"from":237,"beats":4}
            ]
          }
        ]
      }},
    {Key:'beyond-20230116.json', LastModified:new Date('2023-01-18'), content:{
        "title":"Beyond The Sea",
        "scores":[
          {
            "subtitle":"",
            "parts":[
              {"name":"Soprano","url":"/Beyond_The_Sea4p.mid?track=0&prog=52","volume":0.35},
              {"name":"Alto","url":"/Beyond_The_Sea4p.mid?track=1&prog=52","volume":0.35},
              {"name":"Tenor","url":"/Beyond_The_Sea4p.mid?track=2&prog=52","volume":0.4},
              {"name":"Bass","url":"/Beyond_The_Sea4p.mid?track=3&prog=52","volume":0.4},
              {"name":"Piano","url":"/Beyond_The_Sea4p.mid?track=4","volume":0.55}
            ],
            "bars":[
              {"from":1, "tempo":132, "timeSig":4, "beats":336}
            ]
          }
        ]
      }},
    {Key:'Shine-20230124.json', LastModified:new Date('2023-01-24'), content:{
        "title":"Shine",
        "scores":[
          {
            "subtitle":"",
            "parts":[
              {"name":"Soprano","url":"/Shine.mid?track=0","volume":0.75},
              {"name":"Alto","url":"/Shine.mid?track=1","volume":0.80},
              {"name":"Men","url":"/Shine.mid?track=2","volume":0.85},
              {"name":"Piano","url":"/Shine.mid?track=4","volume":0.8}
            ],
            "bars":[
              {"from":1, "tempo":88, "timeSig":4, "beats":148},
              {"repeat":1, "beats":68},
              {"from":38, "repeat":2, "beats":36},
              {"from":55, "repeat":1, "beats":16},
              {"from":55, "repeat":2, "beats":16},
              {"beats":16}
            ]
          }
        ]
      }},
    {Key:'love.json', LastModified:new Date('2023-05-30'), content:{
        "type":"score",
        "title":"all you need is love",
        "version":1,
        "scores":[
          {
            "subtitle":"",
            "parts":[
              {"name":"Sop","url":"love.mid?track=0&prog=0","volume":0.75},
              {"name":"Alto","url":"love.mid?track=1&prog=0","volume":0.75},
              {"name":"Tenor","url":"love.mid?track=2&prog=0","volume":0.75},
              {"name":"Bass","url":"love.mid?track=3&prog=0","volume":0.75}
            ],
            "bars":[
              {"from":1, "tempo":100, "timeSig":4, "beats":20},
              {"timeSig": 3, "beats": 3},
              {"timeSig": 4, "beats": 4},
              {"timeSig": 3, "beats": 3},
              {"timeSig": 4, "beats": 12},
              {"timeSig": 3, "beats": 3},
              {"timeSig": 4, "beats": 4},
              {"timeSig": 3, "beats": 3},
              {"timeSig": 4, "beats": 4},
              {"timeSig": 3, "beats": 3},
              {"timeSig": 4, "beats": 12},
              {"timeSig": 3, "beats": 3},
              {"timeSig": 4, "beats": 4},
              {"timeSig": 3, "beats": 3},
              {"timeSig": 4, "beats": 4},
              {"timeSig": 3, "beats": 3},
              {"timeSig": 4, "beats": 12},
              {"timeSig": 3, "beats": 3},
              {"timeSig": 4, "beats": 32},
              {"timeSig": 3, "beats": 3},
              {"timeSig": 4, "beats": 4},
              {"timeSig": 3, "beats": 3},
              {"timeSig": 4, "beats": 12},
              {"timeSig": 3, "beats": 3},
              {"timeSig": 4, "beats": 32},
              {"timeSig": 3, "beats": 3},
              {"timeSig": 4, "beats": 4},
              {"timeSig": 3, "beats": 3},
              {"timeSig": 4, "beats": 12},
              {"timeSig": 3, "beats": 3},
              {"timeSig": 4, "beats": 28, "repeat": 1},
              {"from":59, "beats": 24, "repeat": 2},
              {"from":66, "beats": 4, "repeat": 2},
              {"beats": 12}
            ]
          }
        ]
      }}
  ];
export default {
  files:files.map(f=>Object.assign(f, {Key:'scores/'+f.Key}))
}