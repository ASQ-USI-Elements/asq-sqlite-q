"use strict";

var chai = require('chai');
var sinon = require("sinon");
var should = chai.should();
var expect = chai.expect;
var cheerio = require('cheerio');
var Promise = require('bluebird');
var modulePath = "../../lib/asqCodePlugin";
var fs = require("fs");

describe("asqCodePlugin.js", function(){

  before(function(){
    var then =  this.then = function(cb){
      return cb();
    };

    var create = this.create = sinon.stub().returns({
      then: then
    });

    this.tagName = "asq-code-q";

    this.asq = {
      registerHook: function(){},
      db: {
        model: function(){
          return {
            create: create
          }
        }
      }
    }

    //load html fixtures
    this.simpleHtml = fs.readFileSync(require.resolve('./fixtures/simple.html'), 'utf-8');
    this.noStemHtml = fs.readFileSync(require.resolve('./fixtures/no-stem.html'), 'utf-8');
    this.codeSnippet1 = fs.readFileSync(require.resolve('./fixtures/code-snippet1.txt'), 'utf-8');

    this.asqCodePlugin = require(modulePath);
  });

   describe("parseHtml", function(){

    before(function(){
     sinon.stub(this.asqCodePlugin.prototype, "processEl").returns("res");
    });

    beforeEach(function(){
      this.asqcode = new this.asqCodePlugin(this.asq);
      this.asqCodePlugin.prototype.processEl.reset();
      this.create.reset();
    });

    after(function(){
     this.asqCodePlugin.prototype.processEl.restore();
    });

    it("should call processEl() for all asq-code-q elements", function(done){
      this.asqcode.parseHtml(this.simpleHtml)
      .then(function(){
        this.asqcode.processEl.calledTwice.should.equal(true);
        done();
      }.bind(this))
      .catch(function(err){
        done(err)
      })
    });

    it("should call `model().create()` to persist parsed questions in the db", function(done){
      this.asqcode.parseHtml(this.simpleHtml)
      .then(function(result){
        this.create.calledOnce.should.equal(true);
        this.create.calledWith(["res", "res"]).should.equal(true);
        done();
      }.bind(this))
      .catch(function(err){
        done(err)
      })
    });

    it("should resolve with the file's html", function(done){
      this.asqcode.parseHtml(this.simpleHtml)
      .then(function(result){
        expect(result).to.equal(this.simpleHtml);
        done();
      }.bind(this))
      .catch(function(err){
        done(err)
      })
    });

  });

  describe("processEl", function(){

     beforeEach(function(){
       this.asqcode = new this.asqCodePlugin(this.asq);
     });

    it("should assign a uid to the question if there's not one", function(){
      var $ = cheerio.load(this.simpleHtml);

      //this doesn't have an id
      var el = $("#no-uid")[0];
      this.asqcode.processEl($, el);
      $(el).attr('uid').should.exist;
      $(el).attr('uid').should.not.equal("a-uid");

      //this already has one
      el = $("#uid")[0];
      this.asqcode.processEl($, el);
      $(el).attr('uid').should.exist;
      $(el).attr('uid').should.equal("a-uid");
    });

    it("should find the stem if it exists", function(){
      var $ = cheerio.load(this.simpleHtml);
      var el = $(this.tagName)[0];
      var elWithHtmlInStem = $(this.tagName)[1];

      var result = this.asqcode.processEl($, el);
      expect(result.data.stem).to.equal("<h4>Implement a for loop in Java</h4>");

      var result = this.asqcode.processEl($, elWithHtmlInStem);
      expect(result.data.stem).to.equal("<h4>Implement a for loop in Java</h4>");


      var $ = cheerio.load(this.noStemHtml);
      var el = $(this.tagName)[0];
      var result = this.asqcode.processEl($, el);
      expect(result.data.stem).to.equal("");
    });

    it("should correctly parse the code element", function(){
      var $ = cheerio.load(this.simpleHtml);
      var el = $(this.tagName)[0];

      var result = this.asqcode.processEl($, el);
      expect(result.data.code).to.equal(this.codeSnippet1);
    });

    it("should return correct data", function(){
      var $ = cheerio.load(this.simpleHtml);
      var el = $(this.tagName)[1];

      var result = this.asqcode.processEl($, el);
      expect(result._id).to.equal("a-uid");
      expect(result.type).to.equal(this.tagName);
      expect(result.data.stem).to.equal("<h4>Implement a for loop in Java</h4>");
      expect(result.data.code).to.equal(this.codeSnippet1);
    });
  });

});
