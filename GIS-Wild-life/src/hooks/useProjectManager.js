import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { slugify } from '../utils/helpers';
import { readText } from '../utils/storage';

const API_URL = 'http://localhost:4003/api/projects';

export function useProjectManager(showFlash) {
  const [projects, setProjects] = useState([]);

  const loadProjects = useCallback(async () => {
    try {
      const res = await axios.get(API_URL);
      setProjects(res.data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const addProject = async (title, linkname, sdate, stime, desc, fVid, fJson, fGpx) => {
    const slug = slugify(linkname) || slugify(title);
    if (!title) {
      showFlash('Project title is required.', false);
      return false;
    }
    if (!slug) {
      showFlash('Provide a link name.', false);
      return false;
    }
    if (!fJson && !fGpx) {
      showFlash('Provide at least a .json or a .gpx track.', false);
      return false;
    }

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('slug', slug);
      formData.append('date', sdate);
      formData.append('time', stime);
      formData.append('description', desc);
      
      if (fVid) {
        formData.append('video', fVid);
      }
      
      if (fJson) {
        const text = await readText(fJson);
        // We stringify the JSON because the backend parses it before storing
        formData.append('jsonObj', text);
      }
      if (fGpx) {
        const text = await readText(fGpx);
        formData.append('gpxText', text);
      }

      await axios.post(API_URL, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      showFlash('Added: ' + slug, true);
      loadProjects();
      return true;
    } catch (e) {
      console.error(e);
      showFlash('Error: ' + (e.response?.data?.error || e.message), false);
      return false;
    }
  };

  const toggleProjectStatus = async (id) => {
    try {
      await axios.patch(`${API_URL}/${id}/status`);
      loadProjects();
    } catch (e) {
      console.error(e);
    }
  };

  const deleteProject = async (id, slug) => {
    if (!window.confirm('Permanently delete "' + slug + '" and its media from the server? This cannot be undone.')) {
      return;
    }
    try {
      await axios.delete(`${API_URL}/${id}`);
      showFlash('Deleted: ' + slug, true);
      loadProjects();
    } catch (e) {
      console.error(e);
    }
  };

  return {
    projects,
    addProject,
    toggleProjectStatus,
    deleteProject,
    refreshProjects: loadProjects
  };
}
