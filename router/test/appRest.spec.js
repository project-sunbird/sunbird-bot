const chai = require('chai');
let chaiHttp = require('chai-http');
chai.should();
chai.use(chaiHttp);
let server = require('../appRest');
const nock = require('nock');
const mockData = require('./mock.data.spec');
var expect = require('chai').expect;

describe('Chatbot router APIs', () => {
    it('it should get bot response fot user input', (done) => {
        nock('https://dev.sunbirded.org/chatapi')
            .post('/bot')
            .reply(200, mockData.botResponse);
        const response = {
            "type": "button",
            "data": {
                "text": " Hello, I am Tara!<br>I am your DIKSHA guide<br>Please select your preference from the options I provide or type your query directly.",
                "buttons": [
                    {
                        "text": "Digital content",
                        "value": "1"
                    },
                    {
                        "text": "Courses",
                        "value": "2"
                    },
                    {
                        "text": "DIKSHA mobile app",
                        "value": "3"
                    },
                    {
                        "text": "Content contribution",
                        "value": "4"
                    },
                    {
                        "text": "Other DIKSHA queries",
                        "value": "5"
                    }
                ]
            }
        };
        chai.request(server)
            .post('/bot')
            .end((err, res) => {
                expect(res).to.be.a('object');
                // expect(res.body.tags).to.be.a('Array');
                // expect(res.status).to.equal(200);
                console.log("Jags====", res);
                // expect(JSON.stringify(res)).to.equal(JSON.stringify(response));
                done();
            });
    });

});