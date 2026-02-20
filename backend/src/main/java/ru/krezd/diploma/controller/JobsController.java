package ru.krezd.diploma.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import ru.krezd.diploma.dto.slurm.job.SlurmJobsResponseDTO;
import ru.krezd.diploma.service.JobsService;

@RestController
@RequestMapping("/api/slurm")
@RequiredArgsConstructor
public class JobsController {
    @Autowired
    private JobsService jobsService;

    @GetMapping("/jobs")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SlurmJobsResponseDTO> getJobs(
            @RequestParam(required = false) Long updateTime,
            @RequestParam(required = false) String flags) {

        return ResponseEntity.ok(jobsService.getJobs(updateTime, flags));
    }

    @GetMapping("/user/jobs")
    public ResponseEntity<SlurmJobsResponseDTO> getUserJobs(@RequestParam(required = false) Long updateTime,
                                                            @RequestParam(required = false) String flags,
                                                            @AuthenticationPrincipal UserDetails userDetails) {

        return ResponseEntity.ok(jobsService.getUserJobs(userDetails.getUsername(), updateTime, flags));
    }

    @GetMapping("/job/{jobId}")
    public ResponseEntity<SlurmJobsResponseDTO> getJobById(
            @PathVariable Long jobId,
            @RequestParam(required = false) Long updateTime,
            @RequestParam(required = false) String flags
    ) {
        return ResponseEntity.ok(
                jobsService.getJobById(jobId, updateTime, flags)
        );
    }


    //TODO POST job/{job_id}
    //TODO POST job/submit
    //TODO DELETE job/{job_id}

}
