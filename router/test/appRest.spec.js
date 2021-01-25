const chai = require('chai');
let chaiHttp = require('chai-http');
chai.should();
chai.use(chaiHttp);
let server = require('../appRest');
const nock = require('nock');
const mockData = require('./mock.data.spec');
var expect = require('chai').expect;

describe('Chatbot router APIs', () => {
    it('it should get bot response fot user input on web portal', (done) => {
        nock('https://dev.sunbirded.org/chatapi')
            .post('/bot')
            .reply(200, mockData.botResponse);
        const response = {"type":"button","data":{"text":" Hello, I am Tara!<br>I am your DIKSHA guide<br>Please select your preference from the options I provide or type your query directly.","buttons":[{"text":"Digital content","value":"1"},{"text":"Courses","value":"2"},{"text":"DIKSHA mobile app","value":"3"},{"text":"Content contribution","value":"4"},{"text":"Other DIKSHA queries","value":"5"}]}}
        chai.request(server)
            .post('/bot')
            .send({
                "Body": "0",
                "userId": "449c94833e1caa71aaadfe2567bea945",
                "appId": "prod.diksha.portal",
                "channel": "505c7c48ac6dc1edc9b08f21db5a571d",
                "From": "449c94833e1caa71aaadfe2567bea945"
            })
            .end((err, res) => {
                expect(res).to.be.a('object');
                expect(res.body).to.be.a('Object');
                expect(JSON.stringify(res.body)).to.equal(JSON.stringify(response));
                done();
            });
    });

    xit('it should get bot response fot user input in whats app', (done) => {
        nock('https://preprod.ntp.net.in/chatapi')
            .post('/whatsapp')
            .reply(200, mockData.whatsappResponse);
        const response = {
            "text": "Hi, I’m TARA, your DIKSHA assistant. How may I help you today? \n Select from one of the following options. Send the number corresponding to your choice \n 1- To find and play content \n 2- To download/update the DIKSHA mobile app \n 3- Other Queries",
            "intent": "greet",
            "type": "buttons",
            "buttons": []
        };
        chai.request(server)
            .post('/whatsapp')
            .send({
                "incoming_message": [{
                    "from": "9611654628",
                    "text_type": {
                        "text": "0"
                    }
                }]
            })
            .end((err, res) => {
                expect(res).to.be.a('object');
                expect(res.body).to.be.a('Object');
                expect(JSON.stringify(res.body)).to.equal(JSON.stringify(response));
                done();
            });
    });

    it('refresh the config', (done) => {
        nock('https://dev.sunbirded.org/chatapi')
            .post('/refresh')
            .reply(200, mockData.refreshAPIResponse);
        const response = {
            "msg": "ENV configuration blob path is not defined"
        }
        chai.request(server)
            .post('/refresh')
            .end((err, res) => {
                expect(res).to.be.a('object');
                expect(res.body).to.be.a('Object');
                expect(JSON.stringify(res.body)).to.equal(JSON.stringify(response));
                done();
            });
    });

});