import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { jobsData } from './jobs.data';

@Injectable()
export class ManageJobsService {

  constructor(
    private http: HttpClient,
  ) {
  }

  getJobs() {
    console.log('GET /api/jobs');
    // TODO pull from endpoint
    //return this.http.get<Array<Object>>('api/jobs');
    return jobsData;
  }

  // getJobById(id: string) {
  //   console.log('GET /api/jobs/' + id);
  //   return this.http.get('api/jobs/' + id);
  // }

  // deleteJob(id: string) {
  //   console.log('DELETE /api/jobs/' + id);
  //   return this.http.delete('api/jobs/' + id);
  // }

}
