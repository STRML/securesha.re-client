SecureShare.File = DS.Model.extend({
    name: DS.attr('string'),

    contents: DS.attr('ArrayBuffer')
});

// probably should be mixed-in...
SecureShare.File.reopen({
  // certainly I'm duplicating something that exists elsewhere...
  attributes: function(){
    var attrs = [];
    var model = this;
    $.each(Em.A(Ember.keys(this.get('data.attributes'))), function(idx, key){
      var pair = { key: key, value: model.get(key) };
      attrs.push(pair);
    });
    return attrs;
  }.property()
});

// delete below here if you do not want fixtures
SecureShare.File.FIXTURES = [
  
  {
    id: 0,
    
    name: 'foo',
    
    contents: 'foo'
    
  },
  
  {
    id: 1,
    
    name: 'foo',
    
    contents: 'foo'
    
  }
  
];
