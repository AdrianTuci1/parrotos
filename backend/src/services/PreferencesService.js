import { gcpService } from './GcpService.js';

export class PreferencesService {
  constructor({
    preferencesCollection = (orgId, projectId) => gcpService.firestore
      .collection('organizations')
      .doc(orgId)
      .collection('projects')
      .doc(projectId)
      .collection('preferences'),
  } = {}) {
    this._prefsCollection = preferencesCollection;
  }

  _col(orgId, projectId) {
    return this._prefsCollection(orgId, projectId);
  }

  async getPreferences(orgId, projectId) {
    const col = this._col(orgId, projectId);

    const [globalSnap, viewsSnap, widgetsSnap] = await Promise.all([
      col.doc('global').get(),
      col.doc('global').collection('views').get(),
      col.doc('global').collection('widgets').get(),
    ]);

    const global = globalSnap.exists ? globalSnap.data() : {};
    const views = {};
    viewsSnap.forEach(doc => { views[doc.id] = doc.data(); });
    const widgets = {};
    widgetsSnap.forEach(doc => { widgets[doc.id] = doc.data(); });

    return { global, views, widgets };
  }

  async setViewPreference(orgId, projectId, viewId, data) {
    const ref = this._col(orgId, projectId)
      .doc('global')
      .collection('views')
      .doc(viewId);

    await ref.set({
      ...data,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    const updated = await ref.get();
    return { id: updated.id, ...updated.data() };
  }

  async setWidgetPreference(orgId, projectId, widgetId, data) {
    const ref = this._col(orgId, projectId)
      .doc('global')
      .collection('widgets')
      .doc(widgetId);

    await ref.set({
      ...data,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    const updated = await ref.get();
    return { id: updated.id, ...updated.data() };
  }

  async removeViewPreference(orgId, projectId, viewId) {
    const ref = this._col(orgId, projectId)
      .doc('global')
      .collection('views')
      .doc(viewId);

    await ref.delete();
  }

  async removeWidgetPreference(orgId, projectId, widgetId) {
    const ref = this._col(orgId, projectId)
      .doc('global')
      .collection('widgets')
      .doc(widgetId);

    await ref.delete();
  }

  async setGlobalPreference(orgId, projectId, data) {
    const ref = this._col(orgId, projectId).doc('global');

    await ref.set({
      ...data,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    const updated = await ref.get();
    return updated.data();
  }
}
