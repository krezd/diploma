package ru.krezd.diploma.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;
import ru.krezd.diploma.dto.slurm.job.SlurmJobsResponseDTO;

@Service
@Slf4j
public class JobsService {
    
    @Autowired
    @Qualifier("slurmRestTemplate")
    private RestTemplate slurmRestTemplate;

    @Value("${slurm.rest.address}")
    private String slurmrestdURL;


    public SlurmJobsResponseDTO getJobs(Long updateTime, String flags){

        UriComponentsBuilder builder = UriComponentsBuilder
                .fromUriString(slurmrestdURL + "jobs");

        if (updateTime != null) {
            builder.queryParam("update_time", updateTime);
        }

        if (flags != null && !flags.isBlank()) {
            builder.queryParam("flags", flags);
        }

        return slurmRestTemplate.getForObject(
                builder.toUriString(),
                SlurmJobsResponseDTO.class
        );
    }

    public SlurmJobsResponseDTO getUserJobs(String username, Long updateTime, String flags){
        SlurmJobsResponseDTO jobs = getJobs(updateTime, flags);
        jobs.setJobs(jobs.getJobs().stream().filter(job -> username.equals(job.getUserName())).toList());

        return jobs;
    }


    public SlurmJobsResponseDTO getJobById(Long jobId, Long updateTime, String flags) {
        UriComponentsBuilder builder = UriComponentsBuilder
                .fromUriString(slurmrestdURL + "job/" + jobId);

        if (updateTime != null) {
            builder.queryParam("update_time", updateTime);
        }

        if (flags != null && !flags.isBlank()) {
            builder.queryParam("flags", flags);
        }

        return slurmRestTemplate.getForObject(
                builder.toUriString(),
                SlurmJobsResponseDTO.class
        );
    }





}

