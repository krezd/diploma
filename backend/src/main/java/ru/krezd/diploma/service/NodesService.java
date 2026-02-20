package ru.krezd.diploma.service;

import lombok.ToString;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;
import ru.krezd.diploma.dto.slurm.SlurmOpenapiResponse;
import ru.krezd.diploma.dto.slurm.node.SlurmNodesResponseDTO;

@Service
@Slf4j
public class NodesService {

    @Autowired
    @Qualifier("slurmRestTemplate")
    private RestTemplate slurmRestTemplate;

    @Value("${slurm.rest.address}")
    private String slurmrestdURL;

    public SlurmNodesResponseDTO getNodes(Long updateTime, String flags){

        UriComponentsBuilder builder = UriComponentsBuilder
                .fromUriString(slurmrestdURL + "nodes");

        if (updateTime != null) {
            builder.queryParam("update_time", updateTime);
        }

        if (flags != null && !flags.isBlank()) {
            builder.queryParam("flags", flags);
        }

        return slurmRestTemplate.getForObject(
                builder.toUriString(),
                SlurmNodesResponseDTO.class
        );
    }

    public SlurmNodesResponseDTO getNodeByName(String nodeName, Long updateTime, String flags){

        UriComponentsBuilder builder = UriComponentsBuilder
                .fromUriString(slurmrestdURL + "node/" + nodeName);

        if (updateTime != null) {
            builder.queryParam("update_time", updateTime);
        }

        if (flags != null && !flags.isBlank()) {
            builder.queryParam("flags", flags);
        }

        return slurmRestTemplate.getForObject(
                builder.toUriString(),
                SlurmNodesResponseDTO.class
        );
    }

    public ResponseEntity<?> deleteNode(String nodeName){
        try {
            UriComponentsBuilder builder = UriComponentsBuilder
                    .fromUriString(slurmrestdURL + "node/" + nodeName);
            ResponseEntity<SlurmOpenapiResponse> response = slurmRestTemplate.exchange(builder.toUriString(), HttpMethod.DELETE, null, SlurmOpenapiResponse.class );

            if (response.getStatusCode().is2xxSuccessful())
                log.info("Delete request for node {} was success:", nodeName);
            else
                log.warn("Delete request for node {} was unsuccessful", nodeName);

            return response;
        }
        catch (Exception e){
            log.warn("Delete request for node {} was unsuccessful: {}", nodeName, e.toString());
            return ResponseEntity.badRequest().build();
        }

    }

}
