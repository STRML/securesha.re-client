SecureShare.FileRoute = Ember.Route.extend({
  model: function(model) {
    return SecureShare.File.find(model.file_id);
  }
});

