SecureShare.FilesRoute = Ember.Route.extend({
  model: function() {
    return SecureShare.File.find();
  }
});

